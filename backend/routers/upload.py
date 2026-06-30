from fastapi import APIRouter, UploadFile, File
import fitz  # PyMuPDF
from docx import Document
import re
import uuid
from typing import List

router = APIRouter()

def extract_text_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text

def extract_text_from_docx(file_bytes):
    from io import BytesIO
    doc = Document(BytesIO(file_bytes))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

def extract_text_from_txt(file_bytes):
    return file_bytes.decode('utf-8', errors='ignore')

def detect_pii(text: str, doc_id: str):
    detections = []
    
    # 1. Email Regex
    email_pattern = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
    for m in email_pattern.finditer(text):
        detections.append({
            "id": f"det_{uuid.uuid4().hex[:8]}",
            "text": m.group(0),
            "char_start": m.start(),
            "char_end": m.end(),
            "type": "EMAIL",
            "confidence": 0.99,
            "status": "missed",
            "reason": "Matches standard email regex pattern"
        })
        
    # 2. Phone Regex (simple US/Intl)
    phone_pattern = re.compile(r'(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}')
    for m in phone_pattern.finditer(text):
        detections.append({
            "id": f"det_{uuid.uuid4().hex[:8]}",
            "text": m.group(0),
            "char_start": m.start(),
            "char_end": m.end(),
            "type": "PHONE",
            "confidence": 0.95,
            "status": "missed",
            "reason": "Matches phone number format"
        })
        
    # 3. Simple Name Pattern (Capitalized Words sequence)
    # This is a very naive regex for names just for the hackathon baseline
    name_pattern = re.compile(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b')
    for m in name_pattern.finditer(text):
        detections.append({
            "id": f"det_{uuid.uuid4().hex[:8]}",
            "text": m.group(0),
            "char_start": m.start(),
            "char_end": m.end(),
            "type": "NAME",
            "confidence": 0.70,
            "status": "missed",
            "reason": "Matches basic Capitalized Name structure"
        })

    # Sort detections by char_start to avoid overlap issues later if any, though frontend handles it
    return sorted(detections, key=lambda x: x['char_start'])

@router.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    documents = []
    all_detections = {}
    
    for file in files:
        contents = await file.read()
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
        
        # Analyze
        detections = detect_pii(text, doc_id)
        
        documents.append({
            "doc_id": doc_id,
            "filename": file.filename,
            "file_type": file_type,
            "status": "ready",
            "char_count": len(text),
            "content": text
        })
        
        all_detections[doc_id] = detections
        
    return {
        "documents": documents,
        "detections": all_detections
    }
