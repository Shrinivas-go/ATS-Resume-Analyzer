"""Fine-tune ats-lm: Qwen2.5-0.5B-Instruct + QLoRA (4-bit base, LoRA adapters) on two tasks:
  parse     resume text -> structured JSON
  evaluate  resume + job + dimension scores -> per-dimension reasons + summary (JSON)

Loss is on the assistant reply only (prompt/completion format).

  python scripts/train_lm.py                 # full run
  python scripts/train_lm.py --max-steps 10  # timing check
"""
import argparse
import json
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed"
OUT = ROOT / "models" / "ats-lm-lora"
BASE = "Qwen/Qwen2.5-0.5B-Instruct"
MAX_LEN = 2400


def load(split):
    rows = []
    with open(DATA / f"lm_{split}.jsonl", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            rows.append({"prompt": r["messages"][:2], "completion": r["messages"][2:], "task": r["task"]})
    return Dataset.from_list(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-steps", type=int, default=-1)
    ap.add_argument("--epochs", type=float, default=1)
    args = ap.parse_args()

    tok = AutoTokenizer.from_pretrained(BASE)
    model = AutoModelForCausalLM.from_pretrained(
        BASE,
        quantization_config=BitsAndBytesConfig(
            load_in_4bit=True, bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_use_double_quant=True,
        ),
        dtype=torch.bfloat16,
        attn_implementation="sdpa",
    )

    lora = LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    cfg = SFTConfig(
        output_dir=str(ROOT / "outputs" / "lm"),
        max_length=MAX_LEN,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=16,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_steps=0.03,
        num_train_epochs=args.epochs,
        max_steps=args.max_steps,
        bf16=True,
        gradient_checkpointing=True,
        logging_steps=10,
        eval_strategy="no" if args.max_steps > 0 else "steps",
        eval_steps=100,
        per_device_eval_batch_size=1,
        save_strategy="no" if args.max_steps > 0 else "steps",
        save_steps=100,
        save_total_limit=2,
        report_to="none",
        seed=7,
        completion_only_loss=True,
    )
    trainer = SFTTrainer(
        model=model, args=cfg, peft_config=lora, processing_class=tok,
        train_dataset=load("train").remove_columns("task"),
        eval_dataset=load("val").remove_columns("task").select(range(60)),
    )
    trainer.train()
    if args.max_steps > 0:
        return
    OUT.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(OUT))
    tok.save_pretrained(str(OUT))
    print("saved adapter to", OUT)


if __name__ == "__main__":
    main()
