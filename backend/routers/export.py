from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class ExportRequest(BaseModel):
    detections: List[Dict[str, Any]]

@router.post("/api/export/{doc_id}")
async def export_document(doc_id: str, payload: ExportRequest):
    # For the hackathon, we use the mock plain text
    plain_text = "Arjun Sharma sent an email to arjun.s@law.in regarding the contract. Call him at 9876543210 for details."
    
    # Sort detections descending by start index to avoid offsetting issues when replacing
    sorted_dets = sorted(payload.detections, key=lambda x: x.get("char_start", 0), reverse=True)
    
    output_text = plain_text
    
    for det in sorted_dets:
        # Only redact if status is 'redacted'
        if det.get("status") == "redacted":
            start = det["char_start"]
            end = det["char_end"]
            dtype = det["type"]
            
            # Replace the string slice with the redacted label
            output_text = output_text[:start] + f"[{dtype}]" + output_text[end:]
            
    # Return the file for download
    return PlainTextResponse(
        content=output_text,
        headers={"Content-Disposition": f'attachment; filename="redacted_{doc_id}.txt"'}
    )
