from fastapi import APIRouter, HTTPException
import state

router = APIRouter()

@router.get("/api/document/{doc_id}")
async def get_document(doc_id: str):
    """Return document text and its detections."""
    if doc_id not in state.documents:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    
    doc = state.documents[doc_id]
    dets = state.detections.get(doc_id, [])
    
    return {
        "doc_id": doc_id,
        "filename": doc["filename"],
        "plain_text": doc.get("content", ""),
        "detections": dets
    }

@router.get("/api/documents")
async def list_documents():
    """List all documents in the current session."""
    return {
        "documents": list(state.documents.values()),
        "detections": state.detections
    }

from fastapi.responses import Response

@router.get("/api/document/{doc_id}/raw")
async def get_raw_document(doc_id: str):
    """Return raw document file bytes."""
    if doc_id not in state.original_files:
        raise HTTPException(status_code=404, detail=f"Raw file for {doc_id} not found")
    
    doc = state.documents.get(doc_id, {})
    file_type = doc.get("file_type", "pdf")
    media_type = "application/pdf" if file_type == "pdf" else "application/octet-stream"
    
    return Response(content=state.original_files[doc_id], media_type=media_type)
