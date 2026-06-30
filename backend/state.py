# backend/state.py
# Centralized in-memory store with disk persistence for single-session recovery.
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
SESSIONS_FILE = os.path.join(DATA_DIR, "session_state.json")
FILES_DIR = os.path.join(DATA_DIR, "files")

documents = {}       # doc_id -> document record dict
detections = {}      # doc_id -> list of detection dicts
corrections = {}     # doc_id -> {detection_id -> new_status}
original_files = {}  # doc_id -> raw file bytes (for export)
structures = {}      # doc_id -> list of structure nodes


def save_state():
    try:
        os.makedirs(FILES_DIR, exist_ok=True)
        state_data = {
            "documents": documents,
            "detections": detections,
            "corrections": corrections,
            "structures": structures
        }
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(state_data, f, indent=2)
        
        for doc_id, raw_bytes in original_files.items():
            file_path = os.path.join(FILES_DIR, f"{doc_id}.bin")
            with open(file_path, "wb") as f:
                f.write(raw_bytes)
    except Exception as e:
        print(f"[State] Warning saving state: {e}")


def load_state():
    try:
        if os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                documents.update(data.get("documents", {}))
                detections.update(data.get("detections", {}))
                corrections.update(data.get("corrections", {}))
                structures.update(data.get("structures", {}))
        
        if os.path.exists(FILES_DIR):
            for fname in os.listdir(FILES_DIR):
                if fname.endswith(".bin"):
                    doc_id = fname[:-4]
                    if doc_id not in original_files:
                        with open(os.path.join(FILES_DIR, fname), "rb") as f:
                            original_files[doc_id] = f.read()
    except Exception as e:
        print(f"[State] Warning loading state: {e}")


# Auto-load state on startup
load_state()

