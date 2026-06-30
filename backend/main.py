from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Conseal — PII Redaction Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Stripped-Metadata"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}

from routers import upload, documents, detections, export, explain

app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(detections.router)
app.include_router(export.router)
app.include_router(explain.router)
