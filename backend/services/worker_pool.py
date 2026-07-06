"""
Memory-Aware Worker Sharding Pool for High-Volume Batch Processing (Problem 2: Maya the Paralegal).

Handles 200 to 1000+ files in parallel without exceeding RAM limits or crashing.
Features:
- Hardware-aware pool sizing based on available RAM and CPU cores.
- Bounded task queue for backpressure prevention.
- Overlapping sentence-aware document chunking to prevent entity split drift.
- Real-time per-document progress tracking (chunks_received, chunks_processed).
"""

import os
import time
import queue

# Restrict underlying C++ library thread pools (ONNX/OpenMP) so they don't fight with our Python worker threads
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import psutil
import threading
from typing import List, Dict, Any, Optional
from collections import defaultdict

# Empirical RAM footprint target per worker for GLiNER2-PII F32 ONNX
AVG_WORKER_MEM_MB = 200
MAX_QUEUE_SIZE = 400


class BatchProgressTracker:
    """Tracks per-document chunk execution progress in real-time."""
    def __init__(self):
        self._lock = threading.Lock()
        self.doc_progress: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "doc_id": "",
            "filename": "",
            "status": "QUEUED",
            "chunks_received": 0,
            "chunks_processed": 0,
            "total_chunks": 0,
            "detections": [],
            "error": None,
            "start_time": None,
            "end_time": None,
            "text": ""
        })

    def init_document(self, doc_id: str, filename: str, total_chunks: int = 0, text: str = "", status: str = "PROCESSING"):
        with self._lock:
            self.doc_progress[doc_id] = {
                "doc_id": doc_id,
                "filename": filename,
                "status": status,
                "chunks_received": total_chunks,
                "chunks_processed": 0,
                "total_chunks": total_chunks,
                "detections": [],
                "error": None,
                "start_time": time.time(),
                "end_time": None,
                "text": text
            }

    def update_document_chunks(self, doc_id: str, total_chunks: int, text: str = "", status: str = "PROCESSING"):
        with self._lock:
            if doc_id in self.doc_progress:
                prog = self.doc_progress[doc_id]
                prog["total_chunks"] = total_chunks
                prog["chunks_received"] = total_chunks
                prog["text"] = text
                prog["status"] = status
                # If it happens to be 0 chunks (empty file), mark completed
                if total_chunks == 0:
                    prog["status"] = "COMPLETED"
                    prog["end_time"] = time.time()

    def add_chunk_result(self, doc_id: str, chunk_detections: List[Dict]):
        with self._lock:
            if doc_id not in self.doc_progress:
                return
            prog = self.doc_progress[doc_id]
            prog["chunks_processed"] += 1
            prog["detections"].extend(chunk_detections)
            if prog["chunks_processed"] >= prog["total_chunks"]:
                prog["status"] = "COMPLETED"
                prog["end_time"] = time.time()

    def mark_error(self, doc_id: str, error_msg: str):
        with self._lock:
            if doc_id in self.doc_progress:
                self.doc_progress[doc_id]["status"] = "ERROR"
                self.doc_progress[doc_id]["error"] = error_msg

    def get_progress(self, doc_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return dict(self.doc_progress.get(doc_id, {}))

    def get_all_progress(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            # For the summary, we only return lightweight fields to save bandwidth and CPU
            summary = {}
            for k, v in self.doc_progress.items():
                summary[k] = {
                    "doc_id": v["doc_id"],
                    "status": v["status"],
                    "chunks_processed": v["chunks_processed"],
                    "total_chunks": v["total_chunks"],
                    "start_time": v["start_time"],
                    "error": v.get("error")
                }
            return summary

    def clear_document(self, doc_id: str):
        with self._lock:
            if doc_id in self.doc_progress:
                del self.doc_progress[doc_id]


tracker = BatchProgressTracker()


def split_into_chunks(text: str, max_chars: int = 3500, overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Split large documents into overlapping windows so entities are not cut in half.
    Preserves exact character offsets relative to original document text.
    """
    chunks = []
    start = 0
    text_len = len(text)
    
    if text_len <= max_chars:
        return [{"text": text, "start_offset": 0, "end_offset": text_len, "chunk_idx": 0}]

    chunk_idx = 0
    while start < text_len:
        end = min(start + max_chars, text_len)
        
        # Adjust end to nearest newline or space if not at very end
        if end < text_len:
            last_newline = text.rfind('\n', start, end)
            if last_newline != -1 and (end - last_newline) < 500:
                end = last_newline
            else:
                last_space = text.rfind(' ', start, end)
                if last_space != -1 and (end - last_space) < 200:
                    end = last_space

        chunk_text = text[start:end]
        chunks.append({
            "text": chunk_text,
            "start_offset": start,
            "end_offset": end,
            "chunk_idx": chunk_idx
        })
        chunk_idx += 1
        if end == text_len:
            break
        start = max(0, end - overlap)
    return chunks


class MemoryAwareWorkerPool:
    """
    Worker pool managing bounded queues and memory failsafes.
    """
    def __init__(self):
        self.task_queue = queue.Queue(maxsize=MAX_QUEUE_SIZE)
        self.workers: List[threading.Thread] = []
        self.running = False
        self.max_workers = self._calculate_optimal_workers()

    def _calculate_optimal_workers(self) -> int:
        cpu_cores = os.cpu_count() or 4
        try:
            available_mb = psutil.virtual_memory().available / (1024 * 1024)
            max_workers_by_mem = int(available_mb // AVG_WORKER_MEM_MB)
            # Leave at least 2 cores free for the OS and UI, but use at least 1 worker
            safe_cpu_cores = max(1, cpu_cores - 2)
            optimal = min(safe_cpu_cores, max(1, max_workers_by_mem))
            print(f"[WorkerPool] Hardware detected: {cpu_cores} CPUs, {available_mb:.0f} MB RAM available.")
            print(f"[WorkerPool] Initialized pool with {optimal} memory-aware workers (leaving {cpu_cores - optimal} free).")
            return optimal
        except Exception as e:
            print(f"[WorkerPool] Hardware detection error ({e}). Defaulting to 4 workers.")
            return min(4, cpu_cores)

    def start(self):
        if self.running:
            return
        self.running = True
        for i in range(self.max_workers):
            t = threading.Thread(target=self._worker_loop, name=f"BatchWorker-{i}", daemon=True)
            t.start()
            self.workers.append(t)
        print(f"[WorkerPool] Started {len(self.workers)} worker threads successfully.")

    def _worker_loop(self):
        try:
            # Import model & heuristics inside worker loop
            from services.gliner_service import detect_pii_gliner, get_gliner_model
            from services.heuristic import run_heuristic_detection, merge_detections, align_detection_boundaries
            
            # Ensure model is accessible in this thread
            get_gliner_model()

            while self.running:
                try:
                    task = self.task_queue.get(timeout=1.0)
                except queue.Empty:
                    continue

                doc_id = task["doc_id"]
                chunk_text = task["text"]
                start_offset = task["start_offset"]
                policy = task["policy"]
                custom_labels = task.get("custom_labels")

                try:
                    # Check memory failsafe before heavy execution
                    if psutil.virtual_memory().available / (1024 * 1024) < 500:
                        time.sleep(0.5)  # Backpressure wait if RAM < 500MB

                    # Execute detection pipeline on chunk
                    gliner_dets = detect_pii_gliner(chunk_text, policy_name=policy, custom_labels=custom_labels)
                    heuristic_dets = run_heuristic_detection(chunk_text)
                    merged = merge_detections(gliner_dets, heuristic_dets)
                    aligned = align_detection_boundaries(chunk_text, merged)

                    print(f"[Worker {threading.current_thread().name}] Doc {doc_id[:6]} | Chunk: {task.get('chunk_idx', '?')} | GLiNER: {len(gliner_dets)} | Heuristics: {len(heuristic_dets)}")

                    # Translate chunk offsets back to global document offsets
                    for det in aligned:
                        if "start" in det:
                            det["start"] += start_offset
                        if "char_start" in det:
                            det["char_start"] += start_offset
                        if "end" in det:
                            det["end"] += start_offset
                        if "char_end" in det:
                            det["char_end"] += start_offset

                    tracker.add_chunk_result(doc_id, aligned)
                except Exception as e:
                    print(f"[WorkerPool] Chunk processing error on doc {doc_id}: {e}")
                    tracker.mark_error(doc_id, str(e))
                finally:
                    self.task_queue.task_done()
        except Exception as e:
            print(f"[WorkerPool] Fatal thread error: {e}")

    def submit_document(self, doc_id: str, filename: str, text: str, policy: str, custom_labels: Optional[List[str]] = None):
        if not self.running:
            self.start()

        chunks = split_into_chunks(text)
        tracker.init_document(doc_id, filename, len(chunks), text=text)

        for chunk in chunks:
            task = {
                "doc_id": doc_id,
                "text": chunk["text"],
                "start_offset": chunk["start_offset"],
                "policy": policy,
                "custom_labels": custom_labels,
                "chunk_idx": chunk.get("chunk_idx", "?")
            }
            # Enqueue with backpressure wait if full
            while True:
                try:
                    self.task_queue.put(task, timeout=0.5)
                    break
                except queue.Full:
                    time.sleep(0.1)


# Global pool instance
batch_pool = MemoryAwareWorkerPool()
