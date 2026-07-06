import time
import os
import requests
import statistics

API_PROGRESS_URL = "http://localhost:8000/api/batch/progress"

print("==================================================")
print(" CONSEAL BATCH PROCESSING LIVE MONITOR ")
print("==================================================\n")
print("Waiting for batch upload to start from the UI...")

def monitor_batch():
    batch_active = False
    start_time = None
    first_file_ready_time = None
    file_completion_times = {} # doc_id -> absolute time completed
    
    while True:
        try:
            resp = requests.get(API_PROGRESS_URL)
            if resp.status_code == 200:
                data = resp.json().get("documents", {})
                
                if not data:
                    if batch_active:
                        print("\nQueue is empty! Waiting for next batch...")
                        batch_active = False
                        start_time = None
                        first_file_ready_time = None
                        file_completion_times.clear()
                    time.sleep(1)
                    continue

                if not batch_active:
                    print("\n🚀 Batch Detected! Monitoring worker pool...")
                    batch_active = True
                    start_time = time.time()
                
                completed = 0
                total = len(data)
                
                for doc_id, stats in data.items():
                    if stats.get("status") == "COMPLETED":
                        completed += 1
                        
                        if doc_id not in file_completion_times:
                            file_completion_times[doc_id] = time.time()
                            
                        if first_file_ready_time is None:
                            first_file_ready_time = time.time() - start_time
                            print(f"\n✅ [TTFF] First file is ready! User Waiting Time: {first_file_ready_time:.2f} seconds!")

                elapsed = time.time() - start_time
                percent = (completed / total) * 100 if total > 0 else 0
                
                # Clear line and print progress
                print(f"\rProgress: {completed}/{total} files COMPLETED ({percent:.1f}%) | Elapsed: {elapsed:.1f}s", end="")
                
                if completed >= total and total > 0:
                    print("\n\n==================================================")
                    print(" BATCH COMPLETED - FINAL METRICS ")
                    print("==================================================")
                    
                    if file_completion_times:
                        # Calculate relative latencies
                        latencies = [t - start_time for t in file_completion_times.values()]
                        total_time = max(latencies)
                        
                        print(f"Total Processing Time:       {total_time:.2f} seconds")
                        print(f"User Waiting Time (TTFF):    {first_file_ready_time:.2f} seconds")
                        print(f"Worker Throughput:           {total / total_time:.2f} files / second")
                        print("\nFile-Level Latency Stats:")
                        print(f"  - Minimum Time: {min(latencies):.2f} seconds")
                        print(f"  - Maximum Time: {max(latencies):.2f} seconds")
                        print(f"  - Average Time: {statistics.mean(latencies):.2f} seconds")
                        print(f"  - Median Time:  {statistics.median(latencies):.2f} seconds")
                    
                    print("==================================================\n")
                    print("Waiting for next batch...")
                    batch_active = False
                    start_time = None
                    first_file_ready_time = None
                    file_completion_times.clear()
                    
                    # Sleep a bit before resetting to let user read
                    time.sleep(3)
                    
            time.sleep(0.5)
            
        except Exception as e:
            print(f"\rWaiting for FastAPI Server (http://localhost:8000)...", end="")
            time.sleep(2)

if __name__ == "__main__":
    try:
        monitor_batch()
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
