"""Evaluate ats-lm against the untuned base model on held-out test examples.

  parse:    valid JSON, current_title match, years_experience within 1, skills Jaccard
  evaluate: valid JSON, 5 dimensions present, scores copied correctly, ROUGE-L of reasons vs teacher

  python scripts/eval_lm.py --n 40
"""
import argparse
import json
import re
import time
from pathlib import Path

import torch
from peft import PeftModel
from rouge_score import rouge_scorer
from transformers import AutoModelForCausalLM, AutoTokenizer

ROOT = Path(__file__).resolve().parents[1]
BASE = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER = ROOT / "models" / "ats-lm-lora"
DIMS = ["skills_match", "experience_relevance", "education_certifications", "industry_domain_fit", "seniority_role_alignment"]
rouge = rouge_scorer.RougeScorer(["rougeL"], use_stemmer=True)


def first_json(text):
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def skills(obj):
    out = set()
    for k in ("core_skills", "secondary_skills", "tools"):
        for s in (obj or {}).get(k) or []:
            out.add(str(s).strip().lower())
    return out


def generate(model, tok, messages, max_new=700):
    ids = tok.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt", return_dict=True).to(model.device)
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=max_new, do_sample=False, repetition_penalty=1.05)
    return tok.decode(out[0, ids["input_ids"].shape[1]:], skip_special_tokens=True)


def score(rows, model, tok):
    m = {"parse": {"n": 0, "valid": 0, "title": 0, "years": 0, "jacc": 0.0},
         "evaluate": {"n": 0, "valid": 0, "dims_ok": 0, "scores_ok": 0, "rougeL": 0.0}}
    t0 = time.time()
    for r in rows:
        task, msgs = r["task"], r["messages"]
        gold = json.loads(msgs[2]["content"])
        pred = first_json(generate(model, tok, msgs[:2]))
        s = m[task]
        s["n"] += 1
        if pred is None:
            continue
        s["valid"] += 1
        if task == "parse":
            s["title"] += str(pred.get("current_title", "")).strip().lower() == str(gold.get("current_title", "")).strip().lower()
            try:
                s["years"] += abs(float(pred.get("years_experience") or 0) - float(gold.get("years_experience") or 0)) <= 1
            except (TypeError, ValueError):
                pass
            a, b = skills(pred), skills(gold)
            s["jacc"] += len(a & b) / len(a | b) if a | b else 1.0
        else:
            dims = {d.get("name"): d for d in pred.get("dimensions", []) if isinstance(d, dict)}
            if set(dims) == set(DIMS):
                s["dims_ok"] += 1
                gd = {d["name"]: d for d in gold["dimensions"]}
                s["scores_ok"] += all(int(dims[k].get("score", -1)) == gd[k]["score"] for k in DIMS)
                s["rougeL"] += sum(rouge.score(gd[k]["reason"], str(dims[k].get("reason", "")))["rougeL"].fmeasure for k in DIMS) / 5
    out = {}
    for task, s in m.items():
        n = max(s.pop("n"), 1)
        out[task] = {k: round(v / n, 3) for k, v in s.items()} | {"n": n}
    out["sec_per_example"] = round((time.time() - t0) / max(len(rows), 1), 1)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=40, help="examples per task")
    args = ap.parse_args()
    rows = [json.loads(l) for l in open(ROOT / "data" / "processed" / "lm_test.jsonl", encoding="utf-8")]
    rows = [r for r in rows if r["task"] == "evaluate"][: args.n] + [r for r in rows if r["task"] == "parse"][: args.n]

    tok = AutoTokenizer.from_pretrained(BASE)
    base = AutoModelForCausalLM.from_pretrained(BASE, dtype=torch.float16, device_map="cuda")
    results = {"base": score(rows, base, tok)}
    tuned = PeftModel.from_pretrained(base, str(ADAPTER))
    results["ats-lm"] = score(rows, tuned, tok)
    print(json.dumps(results, indent=2))
    (ADAPTER / "eval.json").write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
