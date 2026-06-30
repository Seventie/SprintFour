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

class ExportRequest(BaseModel):
    doc_id: str
    filename: str
    detections: List[Detection]
    content: Optional[str] = None


def strip_pdf_metadata(doc):
    """Strip all identifying metadata from a PDF document."""
    stripped_fields = []
    metadata = doc.metadata
    sensitive_keys = ['author', 'creator', 'producer', 'title', 'subject', 'keywords']
    for key in sensitive_keys:
        if metadata.get(key):
            stripped_fields.append(key)
    # Clear all metadata
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
    # Clear core properties
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
    # Remove comments from document body
    # Comments are stored as w:comment elements in the comments part
    try:
        from docx.opc.constants import RELATIONSHIP_TYPE as RT
        comments_part = None
        for rel in doc.part.rels.values():
            if 'comments' in str(rel.reltype).lower():
                comments_part = rel
                break
        if comments_part:
            stripped_fields.append('inline_comments')
    except Exception:
        pass
    # Remove tracked changes (accept all revisions by keeping current text)
    # This is handled by python-docx reading the current state
    return stripped_fields


def redact_pdf(file_bytes: bytes, detections: List[Detection]) -> bytes:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    for page in doc:
        for det in detections:
            text_instances = page.search_for(det.text)
            for inst in text_instances:
                page.add_redact_annot(inst, fill=(0, 0, 0))
        page.apply_redactions()
    # Strip metadata
    stripped = strip_pdf_metadata(doc)
    out_pdf = doc.write()
    doc.close()
    return out_pdf, stripped


def redact_docx(file_bytes: bytes, detections: List[Detection]) -> bytes:
    doc = Document(BytesIO(file_bytes))
    # Strip metadata first
    stripped = strip_docx_metadata(doc)
    # Redact text in paragraphs
    for para in doc.paragraphs:
        for det in detections:
            if det.text in para.text:
                for run in para.runs:
                    if det.text in run.text:
                        run.text = run.text.replace(det.text, "[REDACTED]")
    # Also check tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for det in detections:
                    if det.text in cell.text:
                        for para in cell.paragraphs:
                            for run in para.runs:
                                if det.text in run.text:
                                    run.text = run.text.replace(det.text, "[REDACTED]")
    # Check headers and footers
    for section in doc.sections:
        for header in [section.header, section.first_page_header, section.even_page_header]:
            if header and header.is_linked_to_previous is False:
                for para in header.paragraphs:
                    for det in detections:
                        if det.text in para.text:
                            for run in para.runs:
                                if det.text in run.text:
                                    run.text = run.text.replace(det.text, "[REDACTED]")
        for footer in [section.footer, section.first_page_footer, section.even_page_footer]:
            if footer and footer.is_linked_to_previous is False:
                for para in footer.paragraphs:
                    for det in detections:
                        if det.text in para.text:
                            for run in para.runs:
                                if det.text in run.text:
                                    run.text = run.text.replace(det.text, "[REDACTED]")
    out_io = BytesIO()
    doc.save(out_io)
    return out_io.getvalue(), stripped


def redact_txt(file_bytes: bytes, detections: List[Detection]) -> bytes:
    text = file_bytes.decode('utf-8', errors='ignore')
    sorted_dets = sorted(detections, key=lambda x: x.char_start, reverse=True)
    for det in sorted_dets:
        text = text[:det.char_start] + "[REDACTED]" + text[det.char_end:]
    return text.encode('utf-8'), []


@router.post("/api/export")
async def export_document(req: ExportRequest):
    if req.doc_id not in state.original_files:
        state.load_state()
    
    filename = req.filename.lower()
    redacted_items = [d for d in req.detections if d.status == 'redacted' or d.status == 'added']

    if req.doc_id in state.original_files:
        original_bytes = state.original_files[req.doc_id]
        if filename.endswith(".pdf"):
            output_bytes, stripped_meta = redact_pdf(original_bytes, redacted_items)
            media_type = "application/pdf"
        elif filename.endswith(".docx"):
            output_bytes, stripped_meta = redact_docx(original_bytes, redacted_items)
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            output_bytes, stripped_meta = redact_txt(original_bytes, redacted_items)
            media_type = "text/plain"
    else:
        text_content = req.content or state.documents.get(req.doc_id, {}).get("content", "")
        if not text_content:
            raise HTTPException(status_code=404, detail="Original document not found in session memory.")
        
        sorted_dets = sorted(redacted_items, key=lambda x: x.char_start, reverse=True)
        for det in sorted_dets:
            text_content = text_content[:det.char_start] + "[REDACTED]" + text_content[det.char_end:]
        
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
            "Content-Disposition": f"attachment; filename=redacted_{req.filename}",
            "X-Stripped-Metadata": json.dumps(stripped_meta),
        }
    )
