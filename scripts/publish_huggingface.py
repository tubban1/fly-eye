from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import HfApi

repo_id = os.environ.get("HF_REPO_ID")
token = os.environ.get("HF_TOKEN")
folder = Path(os.environ.get("HF_DATASET_DIR", "dist/huggingface/escape-neuron-v1"))

if not repo_id:
    raise SystemExit("HF_REPO_ID is required")
if not token:
    raise SystemExit("HF_TOKEN is required")
if not folder.exists():
    raise SystemExit(f"Dataset directory does not exist: {folder}")

api = HfApi(token=token)
api.create_repo(repo_id=repo_id, repo_type="dataset", exist_ok=True, private=False)
api.upload_folder(
    repo_id=repo_id,
    repo_type="dataset",
    folder_path=str(folder),
    commit_message="Publish FlyEye escape-neuron-v1",
)

print(f"Published https://huggingface.co/datasets/{repo_id}")
