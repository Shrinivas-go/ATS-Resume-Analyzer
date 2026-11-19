"""Train ats-scorer: a ModernBERT cross-encoder that reads (job, resume) and predicts the
five dimension scores (0-20 each). Total = sum of dimensions (0-100).

  python scripts/train_scorer.py                 # full run
  python scripts/train_scorer.py --max-steps 20  # timing check
"""
import argparse
import json
from pathlib import Path

import numpy as np
import torch
from scipy.stats import spearmanr
from torch.utils.data import Dataset
from transformers import (AutoModelForSequenceClassification, AutoTokenizer, DataCollatorWithPadding,
                          Trainer, TrainingArguments)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed"
OUT = ROOT / "models" / "ats-scorer"
BASE = "answerdotai/ModernBERT-base"
MAX_LEN = 1536
DIMS = ["skills_match", "experience_relevance", "education_certifications", "industry_domain_fit", "seniority_role_alignment"]


def load(split):
    with open(DATA / f"scorer_{split}.jsonl", encoding="utf-8") as f:
        return [json.loads(l) for l in f]


class Pairs(Dataset):
    def __init__(self, rows, tok):
        self.rows, self.tok = rows, tok

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, i):
        r = self.rows[i]
        enc = self.tok(f"{r['job_title']}\n{r['job']}", r["resume"], truncation="longest_first", max_length=MAX_LEN)
        enc["labels"] = [s / 20.0 for s in r["dims"]]
        return enc


def metrics(pred):
    p = np.clip(pred.predictions, 0, 1) * 20
    y = pred.label_ids * 20
    tp, ty = p.sum(1), y.sum(1)
    bucket = lambda t: np.digitize(t, [40, 65])  # No fit <40, Potential 40-64, Good >=65
    out = {
        "total_mae": float(np.abs(tp - ty).mean()),
        "total_spearman": float(spearmanr(tp, ty).correlation),
        "fit_bucket_acc": float((bucket(tp) == bucket(ty)).mean()),
    }
    for k, d in enumerate(DIMS):
        out[f"{d}_mae"] = float(np.abs(p[:, k] - y[:, k]).mean())
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-steps", type=int, default=-1)
    ap.add_argument("--epochs", type=float, default=2)
    ap.add_argument("--init", default=BASE, help="start from this model (e.g. models/ats-scorer to continue)")
    ap.add_argument("--lr", type=float, default=3e-5)
    args = ap.parse_args()

    tok = AutoTokenizer.from_pretrained(args.init)
    model = AutoModelForSequenceClassification.from_pretrained(args.init, num_labels=len(DIMS), problem_type="regression")
    train, val, test = (Pairs(load(s), tok) for s in ("train", "val", "test"))

    targs = TrainingArguments(
        output_dir=str(ROOT / "outputs" / "scorer"),
        per_device_train_batch_size=2,
        per_device_eval_batch_size=4,
        gradient_accumulation_steps=8,
        learning_rate=args.lr,
        weight_decay=0.01,
        warmup_steps=0.06,  # transformers 5: a float < 1 is a ratio
        num_train_epochs=args.epochs,
        max_steps=args.max_steps,
        bf16=False,
        fp16=True,
        gradient_checkpointing=True,
        eval_strategy="no" if args.max_steps > 0 else "epoch",
        save_strategy="no" if args.max_steps > 0 else "epoch",
        save_total_limit=1,
        load_best_model_at_end=args.max_steps <= 0,
        metric_for_best_model="total_mae",
        greater_is_better=False,
        logging_steps=20,
        dataloader_num_workers=0,
        report_to="none",
        seed=7,
    )
    trainer = Trainer(model=model, args=targs, train_dataset=train, eval_dataset=val,
                      data_collator=DataCollatorWithPadding(tok), compute_metrics=metrics)
    trainer.train()
    if args.max_steps > 0:
        return

    # Baseline: always predict the training mean for each dimension
    tr = np.array([r["dims"] for r in train.rows], dtype=float)
    te = np.array([r["dims"] for r in test.rows], dtype=float)
    base_mae = float(np.abs(tr.mean(0).sum() - te.sum(1)).mean())

    res = trainer.evaluate(test, metric_key_prefix="test")
    res["baseline_total_mae_predict_mean"] = base_mae
    print(json.dumps(res, indent=2))
    OUT.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(OUT))
    tok.save_pretrained(str(OUT))
    (OUT / "metrics.json").write_text(json.dumps(res, indent=2))
    (OUT / "config_ats.json").write_text(json.dumps({"dims": DIMS, "max_len": MAX_LEN, "base": BASE}, indent=2))


if __name__ == "__main__":
    torch.backends.cuda.matmul.allow_tf32 = True
    main()
