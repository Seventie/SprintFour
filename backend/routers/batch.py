"""
Batch Processing Endpoints for Problem 2 (High-Volume Document Triage).
Interacts with memory-aware sharding worker pool.
"""

import uuid
import threading
from typing import List, Optional, Dict
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.worker_pool import batch_pool, tracker
from routers.upload import (
    extract_text_from_txt,
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_text_from_csv
)
import state

router = APIRouter(prefix="/api/batch", tags=["batch"])


import json
import os

def process_extracted_files_background(file_data: List[Dict], policy: str, custom_labels: Optional[List[str]] = None):
    """Background task to extract text from raw bytes and submit chunks to worker pool."""
    for data in file_data:
        doc_id = data["doc_id"]
        filename = data["filename"]
        lower_name = filename.lower()
        contents = data["contents"]

        try:
            if lower_name.endswith(".pdf"):
                text = extract_text_from_pdf(contents)
            elif lower_name.endswith(".docx"):
                text = extract_text_from_docx(contents)
            elif lower_name.endswith(".csv"):
                text = extract_text_from_csv(contents)
            else:
                text = extract_text_from_txt(contents)
        except Exception as e:
            print(f"Error parsing {filename}: {e}")
            text = contents.decode("utf-8", errors="ignore")

        # Update state with extracted text
        state.documents[doc_id]["content"] = text
        state.documents[doc_id]["char_count"] = len(text)
        
        # Submit to worker pool which handles chunking, backpressure, and worker initialization
        batch_pool.submit_document(doc_id, filename, text, policy, custom_labels=custom_labels)

@router.post("/upload")
async def submit_batch(
    files: List[UploadFile] = File(...),
    policy: Optional[str] = Form("mixed_general"),
    custom_labels: Optional[str] = Form(None),
    default_action_mode: Optional[str] = Form("redact")
):
    """
    Submit 200 to 1000+ documents for memory-aware parallel sharded execution.
    Returns immediately with tracking task IDs so frontend can poll /api/batch/progress.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    submitted_docs = []
    file_data_for_bg = []
    
    for file in files:
        contents = await file.read()
        filename = file.filename or "unknown.txt"
        lower_name = filename.lower()
        
        doc_id = str(uuid.uuid4())
        
        # Save to global state so it's accessible for exports and corrections
        state.original_files[doc_id] = contents
        file_type = "pdf" if lower_name.endswith(".pdf") else "docx" if lower_name.endswith(".docx") else "csv" if lower_name.endswith(".csv") else "txt"
        
        state.documents[doc_id] = {
            "doc_id": doc_id,
            "filename": filename,
            "file_type": file_type,
            "status": "ready",
            "char_count": 0,
            "content": "",
            "default_action_mode": default_action_mode,
            "metadata": {},
        }

        # Init tracker in EXTRACTING state
        tracker.init_document(doc_id, filename, total_chunks=0, text="", status="EXTRACTING")

        file_data_for_bg.append({
            "doc_id": doc_id,
            "filename": filename,
            "contents": contents
        })

        submitted_docs.append({
            "doc_id": doc_id,
            "filename": filename,
            "status": "EXTRACTING"
        })

    # Save to disk exactly once after all files are in memory
    state.save_state()

    # Parse custom labels if provided
    labels_list = None
    if custom_labels:
        try:
            labels_list = json.loads(custom_labels)
        except:
            labels_list = None

    # Offload extraction to a detached background thread
    # We do NOT use FastAPI BackgroundTasks because Starlette waits for it to complete 
    # before fully closing the HTTP response, which hangs the frontend UI.
    threading.Thread(
        target=process_extracted_files_background, 
        args=(file_data_for_bg, policy or "mixed_general", labels_list),
        daemon=True
    ).start()

    return {
        "status": "success",
        "message": f"Submitted {len(submitted_docs)} documents to sharded worker pool.",
        "documents": submitted_docs
    }


@router.post("/upload_local")
async def submit_batch_local(
    folder_path: str = Form(...),
    policy: Optional[str] = Form("mixed_general"),
    custom_labels: Optional[str] = Form(None),
    default_action_mode: Optional[str] = Form("redact")
):
    """
    Bypass multipart/form-data upload completely by reading directly from a local folder.
    Excellent for testing 500+ files locally without browser OOM.
    """
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=400, detail="Invalid folder path or folder does not exist.")

    submitted_docs = []
    file_data_for_bg = []
    
    allowed_exts = {".txt", ".pdf", ".docx", ".csv"}

    # Walk the directory
    for root, _, filenames in os.walk(folder_path):
        for fname in filenames:
            lower_name = fname.lower()
            if any(lower_name.endswith(ext) for ext in allowed_exts):
                full_path = os.path.join(root, fname)
                try:
                    with open(full_path, "rb") as f:
                        contents = f.read()
                except Exception as e:
                    print(f"Skipping {full_path}: {e}")
                    continue

                doc_id = str(uuid.uuid4())
                state.original_files[doc_id] = contents
                
                file_type = "pdf" if lower_name.endswith(".pdf") else "docx" if lower_name.endswith(".docx") else "csv" if lower_name.endswith(".csv") else "txt"
                
                state.documents[doc_id] = {
                    "doc_id": doc_id,
                    "filename": fname,
                    "file_type": file_type,
                    "status": "ready",
                    "char_count": 0,
                    "content": "",
                    "default_action_mode": default_action_mode,
                    "metadata": {},
                }

                tracker.init_document(doc_id, fname, total_chunks=0, text="", status="EXTRACTING")

                file_data_for_bg.append({
                    "doc_id": doc_id,
                    "filename": fname,
                    "contents": contents
                })

                submitted_docs.append({
                    "doc_id": doc_id,
                    "filename": fname,
                    "status": "EXTRACTING"
                })

    if not submitted_docs:
        raise HTTPException(status_code=400, detail="No valid files found in the specified folder.")

    state.save_state()

    labels_list = None
    if custom_labels:
        try:
            labels_list = json.loads(custom_labels)
        except:
            labels_list = None

    threading.Thread(
        target=process_extracted_files_background, 
        args=(file_data_for_bg, policy or "mixed_general", labels_list),
        daemon=True
    ).start()

    return {
        "status": "success",
        "message": f"Read {len(submitted_docs)} documents from local folder and submitted to worker pool.",
        "documents": submitted_docs
    }


@router.get("/progress/{doc_id}")
async def get_doc_progress(doc_id: str):
    """Get real-time chunk execution progress for a specific batch document."""
    prog = tracker.get_progress(doc_id)
    if not prog:
        raise HTTPException(status_code=404, detail="Document ID not found in batch tracker.")
    return prog


@router.get("/progress")
async def get_all_batch_progress():
    """Get status overview for all batch processed documents."""
    return {"documents": tracker.get_all_progress()}


@router.delete("/progress/{doc_id}")
async def clear_doc_progress(doc_id: str):
    """Clear document from tracker memory after frontend successfully fetched it."""
    prog = tracker.get_progress(doc_id)
    if prog and "detections" in prog:
        # Move finalized detections from the ephemeral batch tracker to global persistent state
        state.detections[doc_id] = prog["detections"]
        state.save_state()
        
    tracker.clear_document(doc_id)
    return {"status": "success", "message": "Document cleared from batch memory"}
