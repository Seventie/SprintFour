from fastapi import APIRouter

router = APIRouter()

@router.patch("/api/detection/{detection_id}")
async def update_detection(detection_id: str):
    return {"message": "Update detection stub"}

@router.post("/api/detection/{doc_id}")
async def add_detection(doc_id: str):
    return {"message": "Add detection stub"}

@router.delete("/api/detection/{detection_id}")
async def delete_detection(detection_id: str):
    return {"message": "Delete detection stub"}
