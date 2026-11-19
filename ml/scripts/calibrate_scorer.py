"""Fit a per-dimension linear calibration for ats-scorer on the validation set.

Regression models trained with MSE shrink toward the average score, so strong and weak
matches look closer than they are. y = a * pred + b per dimension (fit on val) stretches
them back. Reports test metrics before and after, and writes calibration.json, which the
service applies.
"""
import json
from pathlib import Path

import numpy as np
import torch
from scipy.stats import spearmanr
from transformers import AutoModelForSequenceClassification, AutoTokenizer

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "models" / "ats-scorer"


def predict(rows, tok, model, max_len):
    out = []
    for i in range(0, len(rows), 8):
        batch = rows[i: i + 8]
        enc = tok([f"{r['job_title']}\n{r['job']}" for r in batch], [r["resume"] for r in batch],
                  truncation="longest_first", max_length=max_len, padding=True, return_tensors="pt").to(model.device)
        with torch.inference_mode(), torch.autocast("cuda", dtype=torch.float16):
            out.append((model(**enc).logits.float().clamp(0, 1) * 20).cpu().numpy())
    return np.concatenate(out)


def report(p, y):
    bucket = lambda t: np.digitize(t, [40, 65])
    tp, ty = p.sum(1), y.sum(1)
    return {
        "total_mae": round(float(np.abs(tp - ty).mean()), 2),
        "total_spearman": round(float(spearmanr(tp, ty).correlation), 3),
        "fit_bucket_acc": round(float((bucket(tp) == bucket(ty)).mean()), 3),
        "pred_std": round(float(tp.std()), 1),
        "label_std": round(float(ty.std()), 1),
    }


def main():
    cfg = json.loads((MD / "config_ats.json").read_text())
    tok = AutoTokenizer.from_pretrained(MD)
    model = AutoModelForSequenceClassification.from_pretrained(MD).cuda().eval()
    load = lambda s: [json.loads(l) for l in open(ROOT / "data" / "processed" / f"scorer_{s}.jsonl", encoding="utf-8")]
    val, test = load("val"), load("test")
    pv, pt = predict(val, tok, model, cfg["max_len"]), predict(test, tok, model, cfg["max_len"])
    yv = np.array([r["dims"] for r in val], float)
    yt = np.array([r["dims"] for r in test], float)

    # Two candidate maps per dimension, chosen on validation only (test stays untouched):
    #   lsq:      least-squares fit of label on prediction (lowest error, still shrinks)
    #   variance: match the labels' mean and spread (stretches strong/weak matches apart)
    #   none:     keep raw predictions (wins if neither map helps on validation)
    def fit(method):
        if method == "none":
            return [{"a": 1.0, "b": 0.0}] * 5
        cal = []
        for k in range(5):
            if method == "lsq":
                a, b = np.polyfit(pv[:, k], yv[:, k], 1)
            else:
                a = yv[:, k].std() / max(pv[:, k].std(), 1e-6)
                b = yv[:, k].mean() - a * pv[:, k].mean()
            cal.append({"a": float(a), "b": float(b)})
        return cal

    apply = lambda p, cal: np.clip(np.stack([p[:, k] * cal[k]["a"] + cal[k]["b"] for k in range(5)], 1), 0, 20)
    cands = {m: fit(m) for m in ("none", "lsq", "variance")}
    val_scores = {m: report(apply(pv, c), yv) for m, c in cands.items()}
    # Prefer the map that gets the fit category right most often, then the lower error
    best = max(cands, key=lambda m: (val_scores[m]["fit_bucket_acc"], -val_scores[m]["total_mae"]))
    cal = cands[best]

    res = {
        "chosen": best,
        "val": val_scores,
        "test_raw": report(pt, yt),
        "test_calibrated": report(apply(pt, cal), yt),
        "calibration": cal,
    }
    print(json.dumps(res, indent=2))
    (MD / "calibration.json").write_text(json.dumps({"dims": cal}, indent=2))
    (MD / "calibration_report.json").write_text(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
