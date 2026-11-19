"""Download the training datasets into ml/data/raw and print their schemas.

Datasets (licences checked 2026-11-18):
  0xnbk/resume-ats-score-v1-en            Apache-2.0  resume/JD pairs with ATS scores -> scorer
  sandeeppanem/resume-json-extraction-5k  Apache-2.0  resume text -> JSON             -> ats-lm parsing
  Mehyaar/Annotated_NER_PDF_Resumes       MIT         skill spans in 5k CVs           -> skill extraction
  build-small-hackathon/job-search-distill Apache-2.0 teacher evaluations            -> ats-lm suggestions
"""
from pathlib import Path

from datasets import get_dataset_config_names, load_dataset
from huggingface_hub import snapshot_download

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)


def show(name, ds):
    print(f"\n=== {name} ===")
    for split, d in ds.items():
        print(f"  {split}: {len(d)} rows, columns={d.column_names}")


def main():
    show("ats-score", load_dataset("0xnbk/resume-ats-score-v1-en", cache_dir=str(RAW / "hf")))
    show("json-extraction", load_dataset("sandeeppanem/resume-json-extraction-5k", cache_dir=str(RAW / "hf")))

    for cfg in get_dataset_config_names("build-small-hackathon/job-search-distill"):
        try:
            show(f"distill/{cfg}", load_dataset("build-small-hackathon/job-search-distill", cfg, cache_dir=str(RAW / "hf")))
        except Exception as e:  # some configs may be empty or gated
            print(f"distill/{cfg}: skipped ({e})")

    path = snapshot_download(
        "Mehyaar/Annotated_NER_PDF_Resumes",
        repo_type="dataset",
        local_dir=str(RAW / "ner"),
        allow_patterns=["ResumesJsonAnnotated.zip", "README.md"],
    )
    print("\nNER data at", path)


if __name__ == "__main__":
    main()
