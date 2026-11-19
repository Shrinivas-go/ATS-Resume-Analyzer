"""Build train/val/test files for the scorer and for ats-lm.

Splits are made by resume_id, so no resume in val/test was seen in training.

Outputs (ml/data/processed/):
  scorer_{train,val,test}.jsonl  {resume, job, dims: [5 scores 0-20], total}
  lm_{train,val,test}.jsonl      {task, messages: [system, user, assistant]}
"""
import json
import random
import re
from pathlib import Path

from datasets import load_dataset
from transformers import AutoTokenizer

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "hf"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

DIMS = ["skills_match", "experience_relevance", "education_certifications", "industry_domain_fit", "seniority_role_alignment"]
SEED = 7
LM_EVAL_TRAIN = 2000   # evaluation examples for ats-lm (fits a few hours on a 4 GB GPU)
LM_PARSE_TRAIN = 1000  # parsing examples for ats-lm
RESUME_TOK, JOB_TOK = 950, 600  # keep in sync with service/app.py

tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-0.5B-Instruct")

SYSTEM_EVAL = (
    "You are ats-lm, an applicant tracking system reviewer. You are given a resume, a job posting, "
    "and the score for each dimension. Explain each score in one or two specific sentences that name "
    "the evidence or the gap, then write a two-sentence summary. Return only JSON."
)
SYSTEM_PARSE = "You are ats-lm, a resume parser. Extract structured information from the resume and return only valid JSON."


def clip(text, n):
    ids = tok(text, add_special_tokens=False).input_ids
    return text if len(ids) <= n else tok.decode(ids[:n]) + " …"

# Some training texts were UTF-8 decoded as Windows-1252 upstream ("â€”" for "—"), and the
# model learned to write them. Reverse that per run of such characters.
_MOJI = re.compile("[Â-ô][\u0080-¿ŒœŠšŸŽžƒˆ˜"
                   "–—‘-„†-•…‰‹›€™�]{1,3}")


def fix_text(v):
    if isinstance(v, dict):
        return {k: fix_text(x) for k, x in v.items()}
    if isinstance(v, list):
        return [fix_text(x) for x in v]
    if not isinstance(v, str):
        return v

    def rep(m):
        t = m.group(0)
        try:
            return t.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return "—" if t.startswith("â€") else t
    return _MOJI.sub(rep, v)


def clean(text):
    text = fix_text(text or "").replace("�", " ")
    return re.sub(r"[ \t]+", " ", text).strip()


def first_sentences(text, n=2, max_chars=420):
    text = clean(text).replace("**", "")
    parts = re.split(r"(?<=[.!?])\s+", text)
    out = " ".join(parts[:n]).strip()
    return out if len(out) <= max_chars else out[: max_chars].rsplit(" ", 1)[0] + "…"


def split_ids(ids):
    ids = sorted(ids)
    random.Random(SEED).shuffle(ids)
    n = len(ids)
    return set(ids[: int(n * 0.8)]), set(ids[int(n * 0.8): int(n * 0.9)]), set(ids[int(n * 0.9):])


def write(name, rows):
    with open(OUT / name, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"{name}: {len(rows)}")


def eval_prompt(resume, job_title, job, scores):
    score_lines = "\n".join(f"- {d}: {s}/20" for d, s in zip(DIMS, scores))
    return (
        f"JOB: {job_title}\n{clip(clean(job), JOB_TOK)}\n\n"
        f"RESUME:\n{clip(clean(resume), RESUME_TOK)}\n\n"
        f"SCORES:\n{score_lines}"
    )


def main():
    D = "build-small-hackathon/job-search-distill"
    evals = load_dataset(D, "job_evals", cache_dir=str(RAW))["train"]
    resumes = {r["resume_id"]: r["resume"] for r in load_dataset(D, "resume_corpus", cache_dir=str(RAW))["train"]}
    jobs = {j["job_id"]: j for j in load_dataset(D, "jobs", cache_dir=str(RAW))["train"]}

    tr, va, te = split_ids({e["resume_id"] for e in evals})
    buckets = {"train": [], "val": [], "test": []}
    for e in evals:
        dims = {d["name"]: d for d in e["dimensions"]}
        if set(dims) != set(DIMS) or not e["overall_reasoning"]:
            continue
        scores = [int(dims[d]["score"]) for d in DIMS]
        job = jobs[e["job_id"]]
        row = {
            "resume": clean(resumes[e["resume_id"]]),
            "job": clean(job["description"]),
            "job_title": job["title"],
            "dims": scores,
            "total": int(e["total"]),
            "reasons": [first_sentences(dims[d]["reasoning"]) for d in DIMS],
            "summary": first_sentences(e["overall_reasoning"]),
        }
        split = "train" if e["resume_id"] in tr else "val" if e["resume_id"] in va else "test"
        buckets[split].append(row)

    for split, rows in buckets.items():
        write(f"scorer_{split}.jsonl", [{k: r[k] for k in ("resume", "job", "job_title", "dims", "total")} for r in rows])

    # ── ats-lm: evaluation task ──
    def to_eval_msg(r):
        target = {
            "dimensions": [{"name": d, "score": s, "reason": why} for d, s, why in zip(DIMS, r["dims"], r["reasons"])],
            "summary": r["summary"],
        }
        return {
            "task": "evaluate",
            "messages": [
                {"role": "system", "content": SYSTEM_EVAL},
                {"role": "user", "content": eval_prompt(r["resume"], r["job_title"], r["job"], r["dims"])},
                {"role": "assistant", "content": json.dumps(target, ensure_ascii=False)},
            ],
        }

    rng = random.Random(SEED)
    lm = {s: [to_eval_msg(r) for r in rows] for s, rows in buckets.items()}
    rng.shuffle(lm["train"])
    lm["train"] = lm["train"][:LM_EVAL_TRAIN]
    lm["val"] = lm["val"][:150]
    lm["test"] = lm["test"][:150]

    # ── ats-lm: parsing task ──
    parse = load_dataset("sandeeppanem/resume-json-extraction-5k", cache_dir=str(RAW))["train"]
    pat = re.compile(r"<\|im_start\|>user\s*Resume:\s*(.*?)<\|im_end\|>.*?<\|im_start\|>assistant\s*(?:<think>.*?</think>)?\s*(\{.*\})\s*<\|im_end\|>", re.S)
    parsed = []
    for r in parse:
        m = pat.search(r["text"])
        if not m:
            continue
        try:
            obj = json.loads(m.group(2))
        except json.JSONDecodeError:
            continue
        parsed.append({
            "task": "parse",
            "messages": [
                {"role": "system", "content": SYSTEM_PARSE},
                {"role": "user", "content": "RESUME:\n" + clip(clean(m.group(1)), RESUME_TOK)},
                {"role": "assistant", "content": json.dumps(obj, ensure_ascii=False)},
            ],
        })
    rng.shuffle(parsed)
    print("parse examples usable:", len(parsed))
    lm["train"] += parsed[:LM_PARSE_TRAIN]
    lm["val"] += parsed[LM_PARSE_TRAIN: LM_PARSE_TRAIN + 75]
    lm["test"] += parsed[LM_PARSE_TRAIN + 75: LM_PARSE_TRAIN + 150]
    rng.shuffle(lm["train"])

    for split, rows in lm.items():
        write(f"lm_{split}.jsonl", rows)


if __name__ == "__main__":
    main()
