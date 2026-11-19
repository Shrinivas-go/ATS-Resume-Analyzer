# Hugging Face Space (Docker SDK). Secret SERVICE_KEY, variable MODEL_REPO (and secret HF_TOKEN if the model repo is private). Set by scripts/deploy_space.py.
FROM python:3.12-slim

RUN useradd -m -u 1000 user
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

COPY --chown=user app.py .
USER user
ENV HF_HOME=/home/user/.cache/huggingface MODEL_DIR=/home/user/app/models PYTHONUNBUFFERED=1
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
