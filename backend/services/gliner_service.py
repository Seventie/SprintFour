"""
GLiNER2-PII Zero-Shot Redaction Engine (ONNX Accelerated)
Backed by: fastino/gliner2-privacy-filter-PII-multi (205M-parameter encoder)

Implements the official 42-label taxonomy across 7 semantic groups and schema-conditioned
domain policies (Healthcare, Finance, Government/Legal, Tech Credentials, Mixed/General).
"""

import uuid
import time
from typing import List, Dict, Optional
import threading
import traceback

# Try importing GLiNER; if unavailable (or downloading), provide clean fallback
try:
    from gliner import GLiNER
    GLINER_AVAILABLE = True
except ImportError:
    GLINER_AVAILABLE = False
    GLiNER = None

import os
_gliner_model = None
_gliner_lock = threading.Lock()
MODEL_NAME = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "onnx_pii"))

# --- Official 42-Label Taxonomy organized by 7 Semantic Groups ---
TAXONOMY_GROUPS = {
    "person_names": [
        "person", "full_name", "first_name", "middle_name", "last_name", "date_of_birth"
    ],
    "contact_address": [
        "email", "phone_number", "address", "street_address", "city", "state_or_region", "postal_code", "country"
    ],
    "government_tax_ids": [
        "government_id", "national_id_number", "passport_number", "drivers_license_number", "license_number", "tax_id", "tax_number"
    ],
    "banking_payment": [
        "bank_account", "account_number", "routing_number", "iban", "payment_card", "card_number", "card_expiry", "card_cvv"
    ],
    "digital_identity": [
        "username", "ip_address", "account_id", "sensitive_account_id"
    ],
    "secrets_credentials": [
        "password", "secret", "api_key", "access_token", "recovery_code"
    ],
    "sensitive_dates": [
        "sensitive_date", "document_date", "expiration_date", "transaction_date"
    ],
}

# --- Schema-Conditioned Domain Policies ---
POLICIES = {
    "healthcare": {
        "labels": [
            "person", "full_name", "date_of_birth", "national_id_number",
            "address", "phone_number", "email", "sensitive_date"
        ],
        "threshold": 0.40,  # Lower threshold to prioritize recall on rare clinical/diagnosis identifiers
        "rule": "mask_full"
    },
    "finance": {
        "labels": [
            "person", "bank_account", "account_number", "routing_number",
            "iban", "payment_card", "card_number", "card_expiry",
            "card_cvv", "tax_id", "tax_number"
        ],
        "threshold": 0.50,
        "rule": "mask_partial"  # e.g. show last 4 digits
    },
    "government_legal": {
        "labels": [
            "person", "full_name", "government_id", "national_id_number",
            "passport_number", "drivers_license_number", "license_number",
            "address", "sensitive_date"
        ],
        "threshold": 0.45,
        "rule": "mask_full"
    },
    "tech_credentials": {
        "labels": [
            "username", "password", "secret", "api_key",
            "access_token", "recovery_code", "ip_address",
            "account_id", "sensitive_account_id"
        ],
        "threshold": 0.50,
        "rule": "mask_full"  # Secrets should never be partially exposed
    },
    "mixed_general": {
        "labels": [
            "person", "full_name", "email", "phone_number",
            "address", "date_of_birth"
        ],
        "threshold": 0.50,
        "rule": "mask_full"
    },
    "education": {
        "labels": [
            "person", "full_name", "date_of_birth", "email", "phone_number",
            "address", "national_id_number", "government_id", "sensitive_date"
        ],
        "threshold": 0.45,
        "rule": "mask_full"
    },
    "hr_employment": {
        "labels": [
            "person", "full_name", "email", "phone_number", "address",
            "date_of_birth", "national_id_number", "tax_id", "tax_number",
            "bank_account", "account_number", "sensitive_date"
        ],
        "threshold": 0.45,
        "rule": "mask_full"
    },
    "insurance": {
        "labels": [
            "person", "full_name", "date_of_birth", "email", "phone_number",
            "address", "national_id_number", "government_id",
            "bank_account", "account_number", "payment_card", "card_number",
            "sensitive_date"
        ],
        "threshold": 0.40,
        "rule": "mask_full"
    },
}


def get_gliner_model():
    """
    Returns a singleton instance of the GLiNER model, loading it if necessary.
    Uses a thread lock to ensure only one thread downloads/loads it initially.
    """
    global _gliner_model
    if not GLINER_AVAILABLE:
        print("[GLiNER] Package 'gliner' not installed. Skipping GLiNER execution.")
        return None

    if _gliner_model is not None:
        return _gliner_model

    with _gliner_lock:
        # Double-check inside lock
        if _gliner_model is not None:
            return _gliner_model

        print(f"[GLiNER] Loading {MODEL_NAME}...")
        
        try:
            # We force ONNX for thread-safe multi-core inference.
            model = GLiNER.from_pretrained(MODEL_NAME, load_onnx_model=True)
            print(f"[GLiNER] ONNX engine loaded successfully for {MODEL_NAME}!")
            _gliner_model = model
            return model
            
        except Exception as e:
            print(f"[GLiNER] CRITICAL FAILURE loading ONNX model: {e}")
            traceback.print_exc()
            return None


def get_reason_for_gliner(entity_type: str, conf: float, text: str, policy_name: str) -> str:
    """Generate human-interpretable rationale for GLiNER2 zero-shot extractions."""
    label_upper = entity_type.upper().replace("_", " ")
    if "PERSON" in entity_type.upper() or "NAME" in entity_type.upper():
        return f"Flagged as {label_upper} by GLiNER2 zero-shot encoder ({conf:.0%} confidence under '{policy_name}' policy). Mandatory human review recommended."
    elif "IBAN" in entity_type.upper() or "ACCOUNT" in entity_type.upper() or "CARD" in entity_type.upper():
        return f"Financial identifier ({label_upper}) detected with {conf:.0%} confidence. High data leakage risk."
    elif "PASSWORD" in entity_type.upper() or "KEY" in entity_type.upper() or "TOKEN" in entity_type.upper():
        return f"Critical secret/credential ({label_upper}) extracted via zero-shot span recognition."
    return f"Identified as {label_upper} ({conf:.0%} confidence) per GLiNER2 '{policy_name}' redaction policy."


def detect_pii_gliner(text: str, policy_name: str = "mixed_general", custom_labels: Optional[List[str]] = None) -> List[Dict]:
    """
    Run GLiNER2-PII zero-shot entity extraction conditioned on domain policy labels.
    Returns standardized detection dictionaries for Conseal.
    """
    model = get_gliner_model()
    if not model or not text:
        return []

    policy = POLICIES.get(policy_name, POLICIES["mixed_general"])
    labels = custom_labels if custom_labels and len(custom_labels) > 0 else policy["labels"]
    threshold = policy["threshold"]

    # print(f"[GLiNER] Starting inference on {len(text)} chars with policy '{policy_name}' (threshold={threshold})")
    t0 = time.time()

    try:
        raw_entities = model.predict_entities(text, labels, threshold=threshold)
    except Exception as e:
        print(f"[GLiNER] Prediction error: {e}")
        return []

    elapsed = time.time() - t0
    # print(f"[GLiNER] Found {len(raw_entities)} raw entities in {elapsed:.2f}s")

    detections = []
    for ent in raw_entities:
        extracted = ent["text"]
        label = ent["label"]
        conf = round(float(ent["score"]), 2)
        start = ent["start"]
        end = ent["end"]

        if conf >= 0.85:
            status = "redacted"
        else:
            status = "missed"

        # print(f"[GLiNER]   -> {label} | '{extracted[:40]}' | conf={conf} | status={status}")

        detections.append({
            "id": f"det_{uuid.uuid4().hex[:8]}",
            "text": extracted,
            "char_start": start,
            "char_end": end,
            "type": label.upper(),
            "confidence": conf,
            "status": status,
            "reason": get_reason_for_gliner(label, conf, extracted, policy_name),
            "source": "gliner_onnx",
            "policy": policy_name,
            "rule": policy["rule"]
        })

    # print(f"[GLiNER] Returning {len(detections)} detections for policy '{policy_name}'")
    return sorted(detections, key=lambda x: x["char_start"])
