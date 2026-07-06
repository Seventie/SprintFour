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

@app.on_event("startup")
def startup_preload():
    """Preload GLiNER model and start worker pool at server boot."""
    import time
    t0 = time.time()
    from services.gliner_service import get_gliner_model
    get_gliner_model()
    from services.worker_pool import batch_pool
    batch_pool.start()
    elapsed = time.time() - t0
    print(f"[Startup] GLiNER model preloaded and worker pool started in {elapsed:.1f}s.")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}

from routers import upload, documents, detections, export, explain, batch

app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(detections.router)
app.include_router(export.router)
app.include_router(explain.router)
app.include_router(batch.router)
