# ATS models

Two models trained for this app, plus the service that runs them.

| Model | What it does | Base | How it's trained |
|---|---|---|---|
| **ats-scorer** | Reads a job posting and a resume together and scores 5 dimensions (0–20 each, total 0–100): skills match, experience, education & certifications, industry fit, seniority | `answerdotai/ModernBERT-base` (Apache-2.0) | Full fine-tune as a 5-output regressor on 7,888 resume–job evaluations, 4 epochs (2 + 2 at a lower learning rate), max 1,536 tokens |
| **ats-lm** | (1) Writes a reason for each score and a summary. (2) Parses a resume into JSON (titles, years, seniority, domain, skills, tools, achievements) | `Qwen/Qwen2.5-0.5B-Instruct` (Apache-2.0) | QLoRA (4-bit base, LoRA r=16 on all linear layers), 2 epochs on 2,000 reviews + 1,000 parses, loss on the answer only |

The written review is conditioned on ats-scorer's numbers, so the text always agrees with the score on screen.

## Data (licences checked 2026-11-18)

| Dataset | Licence | Used for |
|---|---|---|
| [build-small-hackathon/job-search-distill](https://huggingface.co/datasets/build-small-hackathon/job-search-distill) — `job_evals`, `resume_corpus`, `jobs` | Apache-2.0 | 9,855 resume–job evaluations with five 0–20 dimension scores and reasoning (teacher: DeepSeek V4 Pro). Scorer targets and ats-lm review targets |
| [sandeeppanem/resume-json-extraction-5k](https://huggingface.co/datasets/sandeeppanem/resume-json-extraction-5k) | Apache-2.0 | Resume → JSON examples for ats-lm parsing (synthetic structured labels) |

Considered and not used:
- `cnamuangtoun/resume-job-description-fit`: no licence.
- `Mehyaar/Annotated_NER_PDF_Resumes`: MIT, but the skill labels are machine-tagged and noisy ("skills", "Work", "English" tagged as IT skills).

Splits are by **resume**: no resume in validation or test appears in training.

## Results (held-out test set)

**ats-scorer**, 987 test pairs:

| Metric | ats-scorer | Baseline (always predict the average) |
|---|---|---|
| Total score, mean absolute error | **10.9** / 100 | 15.1 |
| Spearman rank correlation with teacher totals | **0.68** | — |
| Fit category accuracy (No fit < 40 / Potential 40–64 / Good ≥ 65) | **58%** | — |
| Per-dimension MAE (0–20) | skills 2.6 · experience 2.8 · education 3.7 · industry 3.0 · seniority 3.3 | — |

Known weakness: predictions are pulled toward the average (spread 14 points against
the labels' 19), so clearly wrong resume/job pairs score higher than they should.
`scripts/calibrate_scorer.py` tried two corrections on the validation set: a least-squares
fit and a spread-matching stretch. Neither beat the raw scores on fit-category accuracy
(raw 59.5%, least squares 59.0%, stretch 59.2%), and stretching raised the error
(MAE 11.4 to 13.1). So the service uses raw scores. The report is in
`models/ats-scorer/calibration_report.json`.

**ats-lm** on 25 + 25 held-out test examples, compared with the untuned base model:

| Task | Metric | ats-lm | Base Qwen2.5-0.5B |
|---|---|---|---|
| Review | Valid JSON | 92% | 96% |
| Review | All 5 dimensions present, with the right scores | **92%** | 0% |
| Review | ROUGE-L of reasons against the teacher | **0.27** | 0.00 |
| Parse | Valid JSON | **88%** | 52% |
| Parse | Current title correct | **68%** | 0% |
| Parse | Years of experience within 1 | **32%** | 8% |
| Parse | Skills overlap (Jaccard) | **0.19** | 0.00 |

Speed: about 19 s per example on the RTX 3050. On a free CPU Space, expect about a minute per review.
The service also repairs JSON that was cut off (`first_json` in `service/app.py`). That repair is not counted in the numbers above.

Labels come from a teacher LLM, not human recruiters. So these models learn to agree with
that teacher, and the numbers above measure agreement with it, not hiring outcomes.

## Reproduce

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cu126
.\.venv\Scripts\pip install transformers peft trl datasets accelerate bitsandbytes scikit-learn scipy rouge-score huggingface_hub
.\.venv\Scripts\python scripts\download_data.py
.\.venv\Scripts\python scripts\prepare_data.py
.\.venv\Scripts\python scripts\train_scorer.py          # ~2 h on an RTX 3050 4 GB
.\.venv\Scripts\python scripts\calibrate_scorer.py
.\.venv\Scripts\python scripts\train_lm.py --epochs 2   # ~2 h
.\.venv\Scripts\python scripts\eval_lm.py --n 25
.\.venv\Scripts\python scripts\export_models.py         # -> service/models/
```

## Serve (Modal, free Starter plan)

Hugging Face now requires PRO for Docker Spaces, so the service runs on [Modal](https://modal.com):
$30 of free compute a month, and the container scales to zero after 5 idle minutes. At 2 cores
and 6 GiB it costs about $0.14 per running hour. Measured on the live service: cold start 18 s,
score 1.3 s, review 11 s, parse 5 s.

One-time setup, from `ml/service` in PowerShell (Git Bash rewrites `/ats-lm` into a Windows path):

```powershell
..\.venv\Scripts\python -m modal setup
..\.venv\Scripts\python -m modal volume create ats-models
..\.venv\Scripts\python -m modal volume put ats-models models/ats-scorer /ats-scorer
..\.venv\Scripts\python -m modal volume put ats-models models/ats-lm /ats-lm
..\.venv\Scripts\python -m modal secret create ats-service SERVICE_KEY=<long random string>
..\.venv\Scripts\python -m modal deploy modal_app.py
```

Then set these in the backend (Render):
- `ML_SERVICE_URL=https://<workspace>--ats-service-web.us-east.modal.run`
- `ML_SERVICE_KEY=<same SERVICE_KEY>`

The backend's `/health` never calls the model service (Render polls it, which would keep the
container running). `/health/models` checks it on demand.

Endpoints:
- `GET /health`
- `POST /score`, `POST /review` and `POST /parse`, each needing the header `X-Service-Key`.

If the service is down, the backend falls back to the rules engine, and the result page says so.
The same container also runs as a Hugging Face Docker Space (`Dockerfile`, `SPACE_README.md`,
`scripts/deploy_space.py`) if you have PRO.

Run locally:

```powershell
cd ml\service
$env:SERVICE_KEY="dev-key"; ..\.venv\Scripts\uvicorn app:app --port 7860
```
