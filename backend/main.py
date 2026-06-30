from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Conseal Hackathon API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

# We will include routers here later
from routers import upload, documents, detections, export

app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(detections.router)
app.include_router(export.router)

