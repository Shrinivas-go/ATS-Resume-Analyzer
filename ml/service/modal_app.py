"""Run the model service on Modal (free Starter plan: $30 of compute a month).

The container scales to zero after 5 idle minutes, so you only pay while scans run
(about $0.14 an hour at 2 cores / 6 GiB). A cold start takes roughly 30-60 s.

One-time setup (from ml/service):
  modal setup                                          # log in (browser)
  modal volume create ats-models
  modal volume put ats-models models/ats-scorer /ats-scorer
  modal volume put ats-models models/ats-lm /ats-lm
  modal secret create ats-service SERVICE_KEY=<long random string>

Deploy:
  modal deploy modal_app.py
"""
import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install_from_requirements("requirements.txt", extra_index_url="https://download.pytorch.org/whl/cpu")
    .env({"MODEL_DIR": "/models", "PYTHONUNBUFFERED": "1"})
    .add_local_file("app.py", "/root/app.py")
)
models = modal.Volume.from_name("ats-models")
app = modal.App("ats-service")


@app.function(
    image=image,
    volumes={"/models": models},
    secrets=[modal.Secret.from_name("ats-service")],
    cpu=2.0,
    memory=6144,
    scaledown_window=300,
    timeout=600,
)
@modal.concurrent(max_inputs=4)  # /score can run while a review generates (app.py serialises generation)
@modal.asgi_app()
def web():
    import sys
    import time

    sys.path.insert(0, "/root")
    import app as service  # starts loading both models in a background thread

    # Wait for the models here, so the first request after a cold start is served instead of
    # getting a 503 "still loading".
    deadline = time.time() + 300
    while time.time() < deadline and not service.state["error"] and not (service.state["scorer"] and service.state["lm"]):
        time.sleep(0.5)
    return service.app
