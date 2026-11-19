"""ats-models: HTTP service for the trained ATS models (runs on a Hugging Face Space, CPU).

  GET  /health                      -> which models are loaded
  POST /score   {resume, job, job_title}            -> 5 dimension scores + total (ats-scorer)
  POST /review  {resume, job, job_title, dims}      -> reason per dimension + summary (ats-lm)
  POST /parse   {resume}                            -> structured profile JSON (ats-lm)

Every POST needs the header  X-Service-Key: $SERVICE_KEY  (the Space is public).
Model locations: MODEL_DIR (default ./models) with ats-scorer/ and ats-lm/ inside, or
MODEL_REPO (a Hugging Face model repo containing those two folders), downloaded at start.
"""
import json
import os
import re
import threading
import time
from pathlib import Path

import torch
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from transformers import (AutoModelForCausalLM, AutoModelForSequenceClassification, AutoTokenizer,
                          StoppingCriteria, StoppingCriteriaList)

DIMS = ["skills_match", "experience_relevance", "education_certifications", "industry_domain_fit", "seniority_role_alignment"]
SERVICE_KEY = os.environ.get("SERVICE_KEY", "")
MODEL_DIR = Path(os.environ.get("MODEL_DIR", Path(__file__).parent / "models"))
MAX_NEW_REVIEW = int(os.environ.get("MAX_NEW_REVIEW", "700"))
MAX_NEW_PARSE = int(os.environ.get("MAX_NEW_PARSE", "420"))

torch.set_num_threads(max(1, os.cpu_count() or 1))

SYSTEM_EVAL = (
    "You are ats-lm, an applicant tracking system reviewer. You are given a resume, a job posting, "
    "and the score for each dimension. Explain each score in one or two specific sentences that name "
    "the evidence or the gap, then write a two-sentence summary. Return only JSON."
)
SYSTEM_PARSE = "You are ats-lm, a resume parser. Extract structured information from the resume and return only valid JSON."

app = FastAPI(title="ats-models", docs_url=None, redoc_url=None)
state = {"scorer": None, "lm": None, "loaded_at": None, "error": None}
lm_lock = threading.Lock()  # one generation at a time on a small CPU


def fetch_models():
    repo = os.environ.get("MODEL_REPO")
    if repo and not (MODEL_DIR / "ats-scorer").exists():
        from huggingface_hub import snapshot_download
        snapshot_download(repo, local_dir=str(MODEL_DIR), token=os.environ.get("HF_TOKEN"))


def load():
    try:
        fetch_models()
        sdir, ldir = MODEL_DIR / "ats-scorer", MODEL_DIR / "ats-lm"
        cfg = json.loads((sdir / "config_ats.json").read_text())
        stok = AutoTokenizer.from_pretrained(sdir)
        smodel = AutoModelForSequenceClassification.from_pretrained(sdir).eval()
        calp = sdir / "calibration.json"
        cal = json.loads(calp.read_text())["dims"] if calp.exists() else [{"a": 1.0, "b": 0.0}] * 5
        state["scorer"] = (stok, smodel, cfg["max_len"], cal)
        ltok = AutoTokenizer.from_pretrained(ldir)
        lmodel = AutoModelForCausalLM.from_pretrained(ldir, dtype=torch.float32).eval()
        state["lm"] = (ltok, lmodel)
        state["loaded_at"] = time.time()
    except Exception as e:  # surface on /health instead of crashing the Space
        state["error"] = f"{type(e).__name__}: {e}"


threading.Thread(target=load, daemon=True).start()


def auth(x_service_key: str = Header(default="")):
    if not SERVICE_KEY or x_service_key != SERVICE_KEY:
        raise HTTPException(status_code=401, detail="bad service key")


def need(name):
    if state[name] is None:
        raise HTTPException(status_code=503, detail=state["error"] or "models are still loading")
    return state[name]


class ScoreIn(BaseModel):
    resume: str = Field(min_length=50, max_length=40000)
    job: str = Field(min_length=30, max_length=40000)
    job_title: str = Field(default="", max_length=200)


class ReviewIn(ScoreIn):
    dims: list[int] = Field(min_length=5, max_length=5)


class ParseIn(BaseModel):
    resume: str = Field(min_length=50, max_length=40000)


def clip(tok, text, n):
    ids = tok(text, add_special_tokens=False).input_ids
    return text if len(ids) <= n else tok.decode(ids[:n]) + " …"


def _close(fragment):
    """Close any open string, array and object in a truncated JSON fragment."""
    stack, in_str, esc = [], False, False
    for ch in fragment:
        if in_str:
            esc = (ch == "\\") and not esc
            if ch == '"' and not esc:
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]" and stack:
            stack.pop()
    tail = '"' if in_str else ""
    return fragment + tail + "".join(reversed(stack))


def first_json(text):
    """Parse the model's JSON. If it was cut off or broke near the end, keep the longest
    prefix that parses once its open brackets are closed (about 1 in 10 raw outputs)."""
    start = text.find("{")
    if start < 0:
        return None
    body = text[start:]
    end = body.rfind("}")
    try:
        return json.loads(body[: end + 1]) if end >= 0 else json.loads(body)
    except json.JSONDecodeError:
        pass
    # Walk back over cut points (after a value or a comma) and try to close the structure
    cuts = [i for i, ch in enumerate(body) if ch in ',}]"'][::-1][:400]
    for i in cuts:
        frag = body[: i + 1] if body[i] != "," else body[:i]
        try:
            return _prune(json.loads(_close(frag)))
        except json.JSONDecodeError:
            continue
    return None


def _prune(v):
    """Drop the half-written last items a repair leaves behind ('' or {'name': ''})."""
    if isinstance(v, dict):
        return {k: _prune(x) for k, x in v.items()}
    if isinstance(v, list):
        items = [_prune(x) for x in v]
        return [x for x in items if x != "" and not (isinstance(x, dict) and all(y in ("", None, [], {}) for y in x.values()))]
    return v

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


def _dedupe(v):
    """The small model sometimes repeats list items ("Pixel Co", "Pixel Co")."""
    if isinstance(v, dict):
        return {k: _dedupe(x) for k, x in v.items()}
    if isinstance(v, list):
        seen, out = set(), []
        for x in map(_dedupe, v):
            key = json.dumps(x, sort_keys=True).lower()
            if key not in seen:
                seen.add(key)
                out.append(x)
        return out
    return v


def sentences(text, n=2):
    """Keep the first n sentences; long generations tend to loop after that."""
    parts = re.split(r"(?<=[.!?])\s+", str(text or "").strip())
    return " ".join(parts[:n]).strip()


class StopOnLoop(StoppingCriteria):
    """Stop when the last WINDOW tokens are one short pattern repeated ("npmjs/npmjs/npmjs…").
    A 0.5B model under greedy decoding occasionally falls into such a loop and would
    otherwise spend the whole token budget on it."""
    WINDOW = 40

    def __call__(self, input_ids, scores, **kwargs):
        t = input_ids[0, -self.WINDOW:].tolist()
        if len(t) < self.WINDOW:
            return False
        return any(all(t[i] == t[i + p] for i in range(len(t) - p)) for p in range(1, 11))


_LOOP = re.compile(r"(.{2,40}?)\1{3,}", re.S)


def unloop(text):
    """Cut a reason at the start of a repeated run, back to its last full sentence."""
    m = _LOOP.search(text)
    if not m:
        return text
    head = text[: m.start()]
    cut = max(head.rfind(". "), head.rfind("! "), head.rfind("? "))
    return head[: cut + 1].strip() if cut > 0 else ""


def generate(messages, max_new, sample=False):
    tok, model = need("lm")
    ids = tok.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt", return_dict=True)
    opts = dict(do_sample=True, temperature=0.7, top_p=0.9, repetition_penalty=1.15) if sample         else dict(do_sample=False, repetition_penalty=1.05)
    with lm_lock, torch.inference_mode():
        out = model.generate(**ids, max_new_tokens=max_new, stopping_criteria=StoppingCriteriaList([StopOnLoop()]), **opts)
    return tok.decode(out[0, ids["input_ids"].shape[1]:], skip_special_tokens=True)


@app.get("/health")
def health():
    return {
        "status": "ok" if state["scorer"] and state["lm"] else "loading" if not state["error"] else "error",
        "scorer": state["scorer"] is not None,
        "lm": state["lm"] is not None,
        "error": state["error"],
    }


@app.post("/score", dependencies=[Depends(auth)])
def score(body: ScoreIn):
    tok, model, max_len, cal = need("scorer")
    t0 = time.time()
    enc = tok(f"{body.job_title}\n{body.job}", body.resume, truncation="longest_first", max_length=max_len, return_tensors="pt")
    with torch.inference_mode():
        raw = (model(**enc).logits[0].clamp(0, 1) * 20).tolist()
    # Calibration (fit on the validation set by scripts/calibrate_scorer.py)
    dims = [int(round(min(20, max(0, v * c["a"] + c["b"])))) for v, c in zip(raw, cal)]
    return {
        "model": "ats-scorer",
        "dimensions": [{"name": n, "score": s, "max": 20} for n, s in zip(DIMS, dims)],
        "total": sum(dims),
        "ms": int((time.time() - t0) * 1000),
    }


@app.post("/review", dependencies=[Depends(auth)])
def review(body: ReviewIn):
    tok, _ = need("lm")
    t0 = time.time()
    scores = "\n".join(f"- {d}: {max(0, min(20, s))}/20" for d, s in zip(DIMS, body.dims))
    prompt = (
        f"JOB: {body.job_title}\n{clip(tok, body.job, 600)}\n\n"
        f"RESUME:\n{clip(tok, body.resume, 950)}\n\nSCORES:\n{scores}"
    )
    messages = [{"role": "system", "content": SYSTEM_EVAL}, {"role": "user", "content": prompt}]

    def attempt(sample):
        obj = fix_text(first_json(generate(messages, MAX_NEW_REVIEW, sample=sample)) or {})
        got = {d.get("name"): d for d in obj.get("dimensions", []) if isinstance(d, dict)}
        reasons = {n: sentences(unloop(str(got.get(n, {}).get("reason", "")))) for n in DIMS}
        # The model sometimes invents a total ("(55/100)"); the real one is on the page already
        summary = re.sub(r"\s*\(\d{1,3}/100\)", "", unloop(str(obj.get("summary", ""))))
        return reasons, sentences(summary)

    reasons, summary = attempt(sample=False)
    # Greedy output sometimes loops or breaks off; one sampled retry fills only the gaps.
    if not summary or not all(reasons.values()):
        more, more_summary = attempt(sample=True)
        reasons = {n: reasons[n] or more[n] for n in DIMS}
        summary = summary or more_summary
    dims = [{"name": n, "score": s, "reason": reasons[n]} for n, s in zip(DIMS, body.dims)]
    if not any(d["reason"] for d in dims):
        raise HTTPException(status_code=502, detail="model returned no usable review")
    return {"model": "ats-lm", "dimensions": dims, "summary": summary,
            "ms": int((time.time() - t0) * 1000)}


@app.post("/parse", dependencies=[Depends(auth)])
def parse(body: ParseIn):
    tok, _ = need("lm")
    t0 = time.time()
    text = generate([{"role": "system", "content": SYSTEM_PARSE},
                     {"role": "user", "content": "RESUME:\n" + clip(tok, body.resume, 950)}], MAX_NEW_PARSE)
    obj = fix_text(first_json(text))
    if obj is None:
        raise HTTPException(status_code=502, detail="model returned invalid JSON")
    return {"model": "ats-lm", "profile": _dedupe(obj), "ms": int((time.time() - t0) * 1000)}
