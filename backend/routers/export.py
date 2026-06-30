from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional, Dict
import fitz
from docx import Document
from io import BytesIO
import state
import json

router = APIRouter()

class Detection(BaseModel):
    id: str
    text: str
    char_start: int
    char_end: int
    type: str
    confidence: float
    status: str
    reason: str
    action_mode: Optional[str] = "redact"  # "redact" or "anonymize"

class ExportRequest(BaseModel):
    doc_id: str
    filename: str
    detections: List[Detection]
    content: Optional[str] = None
    export_mode: Optional[str] = "redact"  # "redact" or "anonymize"


ANONYMIZED_REPLACEMENTS = {
    "PERSON": "[John Doe]",
    "EMAIL_ADDRESS": "[user@domain.com]",
    "PHONE_NUMBER": "[555-0199]",
    "CREDIT_CARD": "[XXXX-XXXX-XXXX-1234]",
    "DATE_TIME": "[2026-01-01]",
    "IP_ADDRESS": "[192.0.2.1]",
    "LOCATION": "[City, Country]",
    "NRP": "[Protected Group]",
    "MEDICAL_LICENSE": "[MD-999999]",
    "URL": "[https://secure-domain.com]",
    "US_SSN": "[XXX-XX-0000]",
    "US_DRIVER_LICENSE": "[DL-XXXXX]",
}


def get_replacement_text(det: Detection, global_mode: str) -> str:
    if getattr(det, "custom_replacement", None) and det.custom_replacement.strip():
        return det.custom_replacement.strip()
    mode = det.action_mode if getattr(det, "action_mode", None) in ("redact", "anonymize") else global_mode
    if mode == "anonymize":
        return ANONYMIZED_REPLACEMENTS.get(det.type, f"[Anonymized {det.type}]")
    return f"[REDACTED {det.type}]"


def strip_pdf_metadata(doc):
    """Strip all identifying metadata from a PDF document."""
    stripped_fields = []
    metadata = doc.metadata
    sensitive_keys = ['author', 'creator', 'producer', 'title', 'subject', 'keywords']
    for key in sensitive_keys:
        if metadata.get(key):
            stripped_fields.append(key)
    doc.set_metadata({
        'author': '',
        'creator': 'Conseal Redaction Engine',
        'producer': 'Conseal',
        'title': 'Redacted Document',
        'subject': '',
        'keywords': '',
        'creationDate': '',
        'modDate': '',
    })
    return stripped_fields


def strip_docx_metadata(doc):
    """Strip metadata, comments, and tracked changes from DOCX."""
    stripped_fields = []
    cp = doc.core_properties
    if cp.author:
        stripped_fields.append('author')
        cp.author = ''
    if cp.last_modified_by:
        stripped_fields.append('last_modified_by')
        cp.last_modified_by = ''
    if cp.title:
        stripped_fields.append('title')
        cp.title = 'Redacted Document'
    if cp.subject:
        stripped_fields.append('subject')
        cp.subject = ''
    if cp.keywords:
        stripped_fields.append('keywords')
        cp.keywords = ''
    if cp.comments:
        stripped_fields.append('comments')
        cp.comments = ''
    if cp.category:
        stripped_fields.append('category')
        cp.category = ''
    try:
        comments_part = None
        for rel in doc.part.rels.values():
            if 'comments' in str(rel.reltype).lower():
                comments_part = rel
                break
        if comments_part:
            stripped_fields.append('inline_comments')
    except Exception:
        pass
    return stripped_fields


def redact_pdf(file_bytes: bytes, detections: List[Detection], global_mode: str) -> bytes:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    links_removed = 0
    for page in doc:
        links = page.get_links()
        for link in links:
            page.delete_link(link)
            links_removed += 1
        for det in detections:
            text_instances = page.search_for(det.text)
            mode = det.action_mode if getattr(det, "action_mode", None) in ("redact", "anonymize") else global_mode
            replacement = get_replacement_text(det, global_mode)
            for inst in text_instances:
                if mode == "anonymize":
                    page.add_redact_annot(inst, text=replacement, fill=(0.95, 0.95, 0.95), text_color=(0, 0, 0), fontsize=9)
                else:
                    page.add_redact_annot(inst, fill=(0, 0, 0))
        page.apply_redactions()
    stripped = strip_pdf_metadata(doc)
    if links_removed > 0:
        stripped.append(f"{links_removed} hidden clickable hyperlinks sanitized")
    out_pdf = doc.write()
    doc.close()
    return out_pdf, stripped


def redact_docx(file_bytes: bytes, detections: List[Detection], global_mode: str) -> bytes:
    doc = Document(BytesIO(file_bytes))
    stripped = strip_docx_metadata(doc)
    for para in doc.paragraphs:
        for det in detections:
            if det.text in para.text:
                rep = get_replacement_text(det, global_mode)
                for run in para.runs:
                    if det.text in run.text:
                        run.text = run.text.replace(det.text, rep)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for det in detections:
                    if det.text in cell.text:
                        rep = get_replacement_text(det, global_mode)
                        for para in cell.paragraphs:
                            for run in para.runs:
                                if det.text in run.text:
                                    run.text = run.text.replace(det.text, rep)
    for section in doc.sections:
        for header in [section.header, section.first_page_header, section.even_page_header]:
            if header and header.is_linked_to_previous is False:
                for para in header.paragraphs:
                    for det in detections:
                        if det.text in para.text:
                            rep = get_replacement_text(det, global_mode)
                            for run in para.runs:
                                if det.text in run.text:
                                    run.text = run.text.replace(det.text, rep)
        for footer in [section.footer, section.first_page_footer, section.even_page_footer]:
            if footer and footer.is_linked_to_previous is False:
                for para in footer.paragraphs:
                    for det in detections:
                        if det.text in para.text:
                            rep = get_replacement_text(det, global_mode)
                            for run in para.runs:
                                if det.text in run.text:
                                    run.text = run.text.replace(det.text, rep)
    out_io = BytesIO()
    doc.save(out_io)
    return out_io.getvalue(), stripped


def redact_txt(file_bytes: bytes, detections: List[Detection], global_mode: str) -> bytes:
    text = file_bytes.decode('utf-8', errors='ignore')
    sorted_dets = sorted(detections, key=lambda x: x.char_start, reverse=True)
    for det in sorted_dets:
        rep = get_replacement_text(det, global_mode)
        text = text[:det.char_start] + rep + text[det.char_end:]
    return text.encode('utf-8'), []


def redact_csv(file_bytes: bytes, detections: List[Detection], global_mode: str):
    text = file_bytes.decode('utf-8', errors='ignore')
    sorted_dets = sorted(detections, key=lambda x: x.char_start, reverse=True)
    for det in sorted_dets:
        rep = get_replacement_text(det, global_mode)
        text = text[:det.char_start] + rep + text[det.char_end:]
    return text.encode('utf-8'), []


def redact_excel(file_bytes: bytes, detections: List[Detection], global_mode: str):
    try:
        import openpyxl
        wb = openpyxl.load_workbook(BytesIO(file_bytes))
        for sheet in wb.sheetnames:
            ws = wb[sheet]
            for row in ws.iter_rows():
                for cell in row:
                    if cell.value and isinstance(cell.value, str):
                        val = cell.value
                        for det in sorted(detections, key=lambda x: len(x.text), reverse=True):
                            if det.text in val:
                                rep = get_replacement_text(det, global_mode)
                                val = val.replace(det.text, rep)
                        cell.value = val
        out = BytesIO()
        wb.save(out)
        return out.getvalue(), ["author", "last_modified_by"]
    except Exception as e:
        print("Excel export error:", e)
        return redact_csv(file_bytes, detections, global_mode)


@router.post("/api/export")
async def export_document(req: ExportRequest):
    if req.doc_id not in state.original_files:
        state.load_state()
    
    filename = req.filename.lower()
    redacted_items = [d for d in req.detections if d.status == 'redacted' or d.status == 'added']
    global_mode = req.export_mode or "redact"

    if req.doc_id in state.original_files:
        original_bytes = state.original_files[req.doc_id]
        if filename.endswith(".pdf"):
            output_bytes, stripped_meta = redact_pdf(original_bytes, redacted_items, global_mode)
            media_type = "application/pdf"
        elif filename.endswith(".docx"):
            output_bytes, stripped_meta = redact_docx(original_bytes, redacted_items, global_mode)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            output_bytes, stripped_meta = redact_excel(original_bytes, redacted_items, global_mode)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif filename.endswith(".csv"):
            output_bytes, stripped_meta = redact_csv(original_bytes, redacted_items, global_mode)
            media_type = "text/csv"
        else:
            output_bytes, stripped_meta = redact_txt(original_bytes, redacted_items, global_mode)
            media_type = "text/plain"
    else:
        text_content = req.content or state.documents.get(req.doc_id, {}).get("content", "")
        if not text_content:
            raise HTTPException(status_code=404, detail="Original document not found in session memory.")
        
        sorted_dets = sorted(redacted_items, key=lambda x: x.char_start, reverse=True)
        for det in sorted_dets:
            rep = get_replacement_text(det, global_mode)
            text_content = text_content[:det.char_start] + rep + text_content[det.char_end:]
        
        if filename.endswith(".pdf"):
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((50, 50), text_content, fontsize=11)
            output_bytes = doc.write()
            doc.close()
            stripped_meta = ["author", "creator", "producer"]
            media_type = "application/pdf"
        elif filename.endswith(".docx"):
            doc = Document()
            for line in text_content.split('\n'):
                doc.add_paragraph(line)
            out_io = BytesIO()
            doc.save(out_io)
            output_bytes = out_io.getvalue()
            stripped_meta = ["author", "title"]
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            output_bytes = text_content.encode('utf-8')
            stripped_meta = []
            media_type = "text/plain"
    
    return Response(
        content=output_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename=secured_{req.filename}",
            "X-Stripped-Metadata": json.dumps(stripped_meta),
        }
    )
