---
title: ATS models
emoji: 📄
colorFrom: gray
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# ats-models

HTTP service for the ATS Resume Checker's two models:

- **ats-scorer**: ModernBERT-base fine-tuned to score a resume against a job posting on five 0–20 dimensions.
- **ats-lm**: Qwen2.5-0.5B-Instruct fine-tuned with QLoRA to explain each score and to parse resumes into JSON.

`GET /health` is open. `POST /score`, `/review` and `/parse` need the `X-Service-Key` header; only the app's backend has it.
