import time
import os
import requests
import statistics
import threading
from datasets import load_dataset
from io import BytesIO

# Configuration
API_UPLOAD_URL = "http://localhost:8000/api/batch/upload"
API_PROGRESS_URL = "http://localhost:8000/api/batch/progress"
NUM_DOCS_TO_TEST = 500

print("==================================================")
print(" LIVE BATCH UPLOAD STRESS TEST (Supported Text) ")
print("==================================================\n")

print(f"1. Downloading {NUM_DOCS_TO_TEST} real text documents from HuggingFace (TinyStories)...")
try:
    # Using a robust namespaced dataset to avoid HuggingFace URI errors
    dataset = load_dataset("roneneldan/TinyStories", split="train", streaming=True)
    documents = []
    
    for i, item in enumerate(dataset):
        if i >= NUM_DOCS_TO_TEST:
            break
        text = item['text']
        # Convert to an in-memory file for multipart/form-data upload
        file_tuple = (f"doc_{i}.txt", BytesIO(text.encode('utf-8')), "text/plain")
        documents.append(file_tuple)
        
except Exception as e:
    print(f"Failed to load dataset: {e}")
    print("Please ensure you have internet access and the 'datasets' package installed.")
    exit(1)

print(f"✅ Successfully prepared {len(documents)} document files.")

print("\n2. Submitting batch to Live API (http://localhost:8000/api/batch/upload)...")
start_upload_time = time.time()

# Prepare files in the format expected by FastAPI's List[UploadFile]
files = [("files", doc) for doc in documents]
data = {"policy": "mixed_general"}

try:
    response = requests.post(API_UPLOAD_URL, files=files, data=data)
    response.raise_for_status()
    result = response.json()
    print(f"✅ API accepted batch! Message: {result.get('message')}")
except Exception as e:
    print(f"❌ Failed to submit batch: {e}")
    print("Is the FastAPI server running on port 8000?")
    exit(1)

upload_complete_time = time.time()
print(f"Network upload latency: {upload_complete_time - start_upload_time:.2f} seconds")

print("\n3. Polling Worker Pool Progress (Tracking TTFF & Wait Times)...")
all_docs_completed = False
first_file_ready_time = None
file_completion_times = {} # doc_id -> seconds taken from upload

# We'll poll every 100ms
poll_start = time.time()

while not all_docs_completed:
    try:
        prog_resp = requests.get(API_PROGRESS_URL)
        prog_data = prog_resp.json().get("documents", {})
    except Exception as e:
        print(f"Error polling progress: {e}")
        time.sleep(1)
        continue
        
    completed_count = 0
    total_docs = len(prog_data)
    
    current_time = time.time()
    elapsed_since_upload = current_time - upload_complete_time
    
    for doc_id, stats in prog_data.items():
        if stats.get("status") == "COMPLETED":
            completed_count += 1
            
            # Track TTFF (Time To First File)
            if first_file_ready_time is None:
                first_file_ready_time = elapsed_since_upload
                print(f"\n🚀 [TTFF] First file is ready for review! User Waiting Time: {first_file_ready_time:.2f} seconds!")
                
            # Track individual file completion latency
            if doc_id not in file_completion_times:
                file_completion_times[doc_id] = elapsed_since_upload
                
    if total_docs > 0:
        percent = (completed_count / total_docs) * 100
        print(f"\rProgress: {completed_count}/{total_docs} files COMPLETED ({percent:.1f}%) | Elapsed: {elapsed_since_upload:.1f}s", end="")
        
    if completed_count >= total_docs and total_docs > 0:
        all_docs_completed = True
        break
        
    time.sleep(0.1)

print("\n\n==================================================")
print(" STRESS TEST RESULTS & METRICS ")
print("==================================================")

if file_completion_times:
    times = list(file_completion_times.values())
    total_time = max(times)
    
    print(f"Total Batch Processing Time: {total_time:.2f} seconds")
    print(f"User Waiting Time (TTFF):    {first_file_ready_time:.2f} seconds")
    print(f"Worker Throughput:           {NUM_DOCS_TO_TEST / total_time:.2f} files / second")
    print("\nFile-Level Latency Stats:")
    print(f"  - Minimum Time: {min(times):.2f} seconds")
    print(f"  - Maximum Time: {max(times):.2f} seconds")
    print(f"  - Average Time: {statistics.mean(times):.2f} seconds")
    print(f"  - Median Time:  {statistics.median(times):.2f} seconds")
else:
    print("No files were successfully processed.")

print("==================================================")
