import os
from huggingface_hub import hf_hub_download

REPO_ID = "onnx-community/gliner_multi_pii-v1"
LOCAL_DIR = os.path.join(os.path.dirname(__file__), "models", "onnx_pii")
os.makedirs(LOCAL_DIR, exist_ok=True)

# The minimal set of files needed for the ONNX GLiNER model.
# By cherry-picking these, we avoid downloading gigabytes of redundant 
# quantized/FP16 models that are packaged in the original repo.
REQUIRED_FILES = [
    "config.json",
    "gliner_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "added_tokens.json",
    "spm.model",
    "onnx/model.onnx"
]

print(f"Fetching minimal ONNX files from {REPO_ID} to {LOCAL_DIR}...\n")

for filename in REQUIRED_FILES:
    print(f"Downloading {filename}...")
    try:
        downloaded_path = hf_hub_download(
            repo_id=REPO_ID,
            filename=filename,
            local_dir=LOCAL_DIR,
            local_dir_use_symlinks=False
        )
        print(f" \u2713 Saved to {downloaded_path}")
    except Exception as e:
        print(f" \u2717 Failed to download {filename}: {e}")

# Rename onnx/model.onnx to just model.onnx in the root of the local dir
# so that GLiNER can find it easily with its default settings.
onnx_sub_path = os.path.join(LOCAL_DIR, "onnx", "model.onnx")
root_onnx_path = os.path.join(LOCAL_DIR, "model.onnx")
if os.path.exists(onnx_sub_path) and not os.path.exists(root_onnx_path):
    os.rename(onnx_sub_path, root_onnx_path)
    os.rmdir(os.path.join(LOCAL_DIR, "onnx"))
    print("\nMoved model.onnx to root directory.")

print("\nModel successfully pre-fetched! You can now start the backend instantly.")
