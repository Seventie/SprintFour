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
        # Skip LLM — build response directly from cached detection metadata
        det = overlapping_detection
        conf = det.get("confidence", 0)
        risk = "high" if conf >= 0.85 else "medium" if conf >= 0.5 else "low"
        return ExplainResponse(
            selected_text=req.selected_text,
            is_detection=True,
            detection=det,
            explanation=det.get("reason", f"Detected as {det.get('type', 'UNKNOWN')} with {conf:.0%} confidence."),
            risk_level=risk,
            source="cached",
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
