from fastapi import APIRouter, UploadFile, File
import fitz  # PyMuPDF
from docx import Document
import uuid
from typing import List
from io import BytesIO
from presidio_analyzer import AnalyzerEngine
import state
from services.heuristic import run_heuristic_detection, merge_detections

router = APIRouter()

# Initialize the Presidio analyzer engine globally
analyzer = AnalyzerEngine()


# --- Confidence-based status assignment ---
def assign_status(confidence: float) -> str:
    if confidence >= 0.85:
        return "redacted"
    elif confidence >= 0.50:
        return "missed"
    else:
        return "false_positive"


# --- Contextual reason generation ---
REASON_TEMPLATES = {
    "PERSON":           "Detected personal name via NLP entity recognition",
    "EMAIL_ADDRESS":    "Matches standard email address format (user@domain)",
    "PHONE_NUMBER":     "Matches phone number pattern",
    "CREDIT_CARD":      "Matches credit/debit card number format",
    "DATE_TIME":        "Detected date/time expression",
    "IP_ADDRESS":       "Matches IPv4/IPv6 address pattern",
    "LOCATION":         "Detected geographic location or address",
    "NRP":              "Detected nationality, religion, or political group",
    "MEDICAL_LICENSE":  "Matches medical license number format",
    "URL":              "Detected URL/web address",
    "US_SSN":           "Matches US Social Security Number format",
    "US_DRIVER_LICENSE":"Matches US driver's license format",
    "US_PASSPORT":      "Matches US passport number format",
    "UK_NHS":           "Matches UK NHS number format",
    "US_BANK_NUMBER":   "Matches US bank account number format",
    "US_ITIN":          "Matches US Individual Taxpayer ID Number",
    "IN_PAN":           "Matches Indian PAN card format (XXXXX0000X)",
    "IN_AADHAAR":       "Matches Indian Aadhaar number format (XXXX XXXX XXXX)",
}


def get_reason(entity_type: str, confidence: float, text: str) -> str:
    base = REASON_TEMPLATES.get(entity_type, f"Presidio NLP model detected {entity_type}")
    if confidence >= 0.85:
        return f"{base}. High confidence — auto-redacted for safety."
    elif confidence >= 0.50:
        return f"{base}. Medium confidence — flagged for human review."
    else:
        return f"{base}. Low confidence — likely a false positive."


def extract_text_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text


def extract_text_from_docx(file_bytes):
    doc = Document(BytesIO(file_bytes))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text


def extract_text_from_txt(file_bytes):
    return file_bytes.decode('utf-8', errors='ignore')


def detect_pii_presidio(text: str) -> List[dict]:
    """Layer 1: Presidio NLP-based detection."""
    detections = []
    results = analyzer.analyze(text=text, language='en')

    for result in results:
        extracted = text[result.start:result.end]
        conf = round(result.score, 2)
        status = assign_status(conf)
        reason = get_reason(result.entity_type, conf, extracted)

        detections.append({
            "id": f"det_{uuid.uuid4().hex[:8]}",
            "text": extracted,
            "char_start": result.start,
            "char_end": result.end,
            "type": result.entity_type,
            "confidence": conf,
            "status": status,
            "reason": reason,
            "source": "model",
        })

    return sorted(detections, key=lambda x: x['char_start'])


@router.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    print(f"--- UPLOAD CALLED --- ({len(files)} files)")
    documents = []
    all_detections = {}

    for file in files:
        contents = await file.read()
        print(f"Processing: {file.filename} ({len(contents)} bytes)")
        filename = file.filename.lower()

        text = ""
        file_type = "txt"

        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(contents)
            file_type = "pdf"
        elif filename.endswith(".docx"):
            text = extract_text_from_docx(contents)
            file_type = "docx"
        else:
            text = extract_text_from_txt(contents)

        doc_id = str(uuid.uuid4())

        # Store raw bytes for export
        state.original_files[doc_id] = contents

        # --- Dual-layer detection ---
        # Layer 1: Presidio NLP model
        model_dets = detect_pii_presidio(text)
        print(f"  Presidio found {len(model_dets)} detections")

        # Layer 2: Heuristic regex safety net
        heuristic_dets = run_heuristic_detection(text)
        print(f"  Heuristic found {len(heuristic_dets)} detections")

        # Merge without duplicates
        merged_dets = merge_detections(model_dets, heuristic_dets)
        print(f"  Merged total: {len(merged_dets)} detections")

        for det in merged_dets:
            src = det.get("source", "unknown")
            print(f"    [{src}] {det['type']} | '{det['text'][:30]}' | {det['confidence']} | {det['status']}")

        doc_record = {
            "doc_id": doc_id,
            "filename": file.filename,
            "file_type": file_type,
            "status": "ready",
            "char_count": len(text),
            "content": text,
        }

        state.documents[doc_id] = doc_record
        state.detections[doc_id] = merged_dets

        documents.append(doc_record)
        all_detections[doc_id] = merged_dets

    state.save_state()

    return {
        "documents": documents,
        "detections": all_detections,
    }

