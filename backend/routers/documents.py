from fastapi import APIRouter

router = APIRouter()

@router.get("/api/document/{doc_id}")
async def get_document(doc_id: str):
    # To be implemented
    return {"message": f"Document {doc_id} stub"}
