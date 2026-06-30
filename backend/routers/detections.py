from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import uuid
import state

router = APIRouter()

class CorrectionRequest(BaseModel):
    status: str
    action_mode: Optional[str] = None  # "redact" or "anonymize"
    doc_id: Optional[str] = None
    detection: Optional[Dict] = None

class AddDetectionRequest(BaseModel):
    text: str
    char_start: int
    char_end: int
    type: str
    reason: str = "Manually added by user"

@router.patch("/api/detection/{detection_id}")
async def update_detection(detection_id: str, req: CorrectionRequest):
    """Update the status and action_mode of a detection."""
    # 1. Check in-memory detections
    for doc_id, dets in state.detections.items():
        for det in dets:
            if det["id"] == detection_id:
                old_status = det["status"]
                det["status"] = req.status
                if req.action_mode:
                    det["action_mode"] = req.action_mode
                state.save_state()
                return {"ok": True, "detection": det, "previous_status": old_status}
    
    # 2. Check disk state
    state.load_state()
    for doc_id, dets in state.detections.items():
        for det in dets:
            if det["id"] == detection_id:
                old_status = det["status"]
                det["status"] = req.status
                if req.action_mode:
                    det["action_mode"] = req.action_mode
                state.save_state()
                return {"ok": True, "detection": det, "previous_status": old_status}

    # 3. Self-healing fallback from frontend request
    if req.doc_id and req.detection:
        if req.doc_id not in state.detections:
            state.detections[req.doc_id] = []
        
        det = dict(req.detection)
        old_status = det.get("status", "missed")
        det["status"] = req.status
        if req.action_mode:
            det["action_mode"] = req.action_mode
        
        found = False
        for i, existing in enumerate(state.detections[req.doc_id]):
            if existing["id"] == detection_id or (existing.get("char_start") == det.get("char_start") and existing.get("char_end") == det.get("char_end")):
                if req.action_mode:
                    det["action_mode"] = req.action_mode
                state.detections[req.doc_id][i] = det
                found = True
                break
        if not found:
            state.detections[req.doc_id].append(det)
        
        state.save_state()
        return {"ok": True, "detection": det, "previous_status": old_status}

    raise HTTPException(status_code=404, detail=f"Detection {detection_id} not found")

@router.post("/api/detection/{doc_id}")
async def add_detection(doc_id: str, req: AddDetectionRequest):
    """User manually marks text as PII."""
    if doc_id not in state.detections:
        state.load_state()
    if doc_id not in state.detections:
        state.detections[doc_id] = []
    
    new_det = {
        "id": f"det_{uuid.uuid4().hex[:8]}",
        "text": req.text,
        "char_start": req.char_start,
        "char_end": req.char_end,
        "type": req.type,
        "confidence": 1.0,
        "status": "redacted",
        "reason": req.reason,
        "source": "manual"
    }
    state.detections[doc_id].append(new_det)
    state.detections[doc_id].sort(key=lambda x: x["char_start"])
    state.save_state()
    return {"ok": True, "detection": new_det}

@router.delete("/api/detection/{detection_id}")
async def delete_detection(detection_id: str):
    """Remove a detection (typically user-added ones)."""
    for doc_id, dets in state.detections.items():
        for i, det in enumerate(dets):
            if det["id"] == detection_id:
                removed = dets.pop(i)
                state.save_state()
                return {"ok": True, "removed": removed}
    state.load_state()
    for doc_id, dets in state.detections.items():
        for i, det in enumerate(dets):
            if det["id"] == detection_id:
                removed = dets.pop(i)
                state.save_state()
                return {"ok": True, "removed": removed}
    raise HTTPException(status_code=404, detail=f"Detection {detection_id} not found")

