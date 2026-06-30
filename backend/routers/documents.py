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
