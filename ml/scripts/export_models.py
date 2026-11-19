"""Package the trained models for the service.

  ml/models/ats-scorer      (already a full model)  -> ml/service/models/ats-scorer
  ml/models/ats-lm-lora     (LoRA adapter)          -> merged into Qwen2.5-0.5B -> ml/service/models/ats-lm

Then upload ml/service/models to a Hugging Face model repo (see ml/README.md).
"""
import shutil
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

ROOT = Path(__file__).resolve().parents[1]
BASE = "Qwen/Qwen2.5-0.5B-Instruct"
DEST = ROOT / "service" / "models"


def main():
    DEST.mkdir(parents=True, exist_ok=True)

    src = ROOT / "models" / "ats-scorer"
    shutil.copytree(src, DEST / "ats-scorer", dirs_exist_ok=True)
    print("copied", src)

    base = AutoModelForCausalLM.from_pretrained(BASE, dtype=torch.float16)
    merged = PeftModel.from_pretrained(base, str(ROOT / "models" / "ats-lm-lora")).merge_and_unload()
    merged.save_pretrained(str(DEST / "ats-lm"), safe_serialization=True)
    AutoTokenizer.from_pretrained(BASE).save_pretrained(str(DEST / "ats-lm"))
    for f in ("eval.json",):
        p = ROOT / "models" / "ats-lm-lora" / f
        if p.exists():
            shutil.copy(p, DEST / "ats-lm" / f)
    print("merged ats-lm into", DEST / "ats-lm")


if __name__ == "__main__":
    main()
