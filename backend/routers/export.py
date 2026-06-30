from fastapi import APIRouter

router = APIRouter()

@router.post("/api/export/{doc_id}")
async def export_document(doc_id: str):
    return {"message": "Export stub"}
