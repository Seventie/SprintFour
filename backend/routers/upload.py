from fastapi import APIRouter

router = APIRouter()

@router.post("/api/upload")
async def upload_files():
    # To be implemented
    return {"message": "Upload stub"}
