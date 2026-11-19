"""Deploy the model service to Hugging Face (run after `hf auth login`).

  python scripts/deploy_space.py              # public model repo (default)
  python scripts/deploy_space.py --private    # private model repo; then add a read-only HF_TOKEN
                                              # secret to the Space yourself (Settings → Secrets)

Creates (or reuses) two repos under your account:
  <user>/ats-models   model repo with ats-scorer/ and ats-lm/
  <user>/ats-service  Docker Space running service/app.py

A random SERVICE_KEY is generated on the first run, stored as a Space secret, and written to
ml/.service-key (gitignored) so you can copy it into Render. It is never printed.
"""
import argparse
import secrets
from pathlib import Path

from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT / "service"
KEY_FILE = ROOT / ".service-key"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--private", action="store_true")
    ap.add_argument("--model-repo", default="ats-models")
    ap.add_argument("--space", default="ats-service")
    args = ap.parse_args()

    api = HfApi()
    user = api.whoami()["name"]
    model_repo, space = f"{user}/{args.model_repo}", f"{user}/{args.space}"

    api.create_repo(model_repo, repo_type="model", private=args.private, exist_ok=True)
    print("uploading models to", model_repo, "(about 1.5 GB)…")
    api.upload_folder(
        repo_id=model_repo, repo_type="model", folder_path=str(SERVICE / "models"),
        ignore_patterns=["**/training_args.bin"], commit_message="ats-scorer and ats-lm",
    )

    api.create_repo(space, repo_type="space", space_sdk="docker", private=False, exist_ok=True)
    key = KEY_FILE.read_text().strip() if KEY_FILE.exists() else secrets.token_urlsafe(48)
    KEY_FILE.write_text(key)
    api.add_space_secret(space, "SERVICE_KEY", key)
    api.add_space_variable(space, "MODEL_REPO", model_repo)

    for src, dst in [("Dockerfile", "Dockerfile"), ("app.py", "app.py"),
                     ("requirements.txt", "requirements.txt"), ("SPACE_README.md", "README.md")]:
        api.upload_file(path_or_fileobj=str(SERVICE / src), path_in_repo=dst, repo_id=space,
                        repo_type="space", commit_message=f"Update {dst}")

    sub = space.replace("/", "-").replace("_", "-").lower()
    print("model repo: https://huggingface.co/" + model_repo)
    print("space:      https://huggingface.co/spaces/" + space)
    print("service URL (for Render ML_SERVICE_URL): https://" + sub + ".hf.space")
    print("service key written to", KEY_FILE)
    if args.private:
        print("next: add a read-only token as the Space secret HF_TOKEN, then restart the Space")


if __name__ == "__main__":
    main()
