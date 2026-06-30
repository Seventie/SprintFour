"""
Explain router — the trust endpoint.

Lets Marcus click ANY word and ask: "Why this? Why not that?"
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import state
from services.groq_explain import get_explanation

router = APIRouter()


class ExplainRequest(BaseModel):
    doc_id: str
    selected_text: str
    char_start: int
    char_end: int
    content: Optional[str] = None
    detections: Optional[List[Dict]] = None


class ExplainResponse(BaseModel):
    selected_text: str
    is_detection: bool
    detection: Optional[Dict] = None
    explanation: str
    risk_level: str
    source: str  # "ai" or "rules"


@router.post("/api/explain", response_model=ExplainResponse)
async def explain_selection(req: ExplainRequest):
    """
    Explain why a piece of text was or wasn't flagged as PII.
    
    - If the selection overlaps a known detection: explain why it WAS flagged
    - If it doesn't overlap: explain why it was NOT flagged
    """
    if req.doc_id not in state.documents:
        state.load_state()

    if req.doc_id not in state.documents:
        if req.content is not None:
            state.documents[req.doc_id] = {
                "doc_id": req.doc_id,
                "content": req.content,
                "filename": "document.txt",
                "file_type": "txt",
            }
            if req.detections is not None:
                state.detections[req.doc_id] = req.detections
            state.save_state()
        else:
            raise HTTPException(status_code=404, detail="Document not found")

    doc = state.documents[req.doc_id]
    doc_text = doc.get("content", req.content or "")
    doc_detections = state.detections.get(req.doc_id, req.detections or [])


    # Find if the selection overlaps any detection
    overlapping_detection = None
    for det in doc_detections:
        # Check for overlap
        if req.char_start < det["char_end"] and req.char_end > det["char_start"]:
            overlapping_detection = det
            break

    # Build context window (surrounding text for LLM)
    ctx_start = max(0, req.char_start - 200)
    ctx_end = min(len(doc_text), req.char_end + 200)
    context = doc_text[ctx_start:ctx_end]

    if overlapping_detection:
        # Explain WHY it was flagged
        result = await get_explanation(
            selected_text=req.selected_text,
            context=context,
            is_redacted=True,
            detection_type=overlapping_detection.get("type"),
            confidence=overlapping_detection.get("confidence"),
            reason=overlapping_detection.get("reason"),
        )
        return ExplainResponse(
            selected_text=req.selected_text,
            is_detection=True,
            detection=overlapping_detection,
            explanation=result["explanation"],
            risk_level=result["risk_level"],
            source=result.get("source", "rules"),
        )
    else:
        # Explain WHY it was NOT flagged
        result = await get_explanation(
            selected_text=req.selected_text,
            context=context,
            is_redacted=False,
        )
        return ExplainResponse(
            selected_text=req.selected_text,
            is_detection=False,
            detection=None,
            explanation=result["explanation"],
            risk_level=result["risk_level"],
            source=result.get("source", "rules"),
        )
