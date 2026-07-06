import time
import urllib.request
import os
import sys

# Add the current directory to sys.path so we can import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.gliner_service import detect_pii_gliner, get_gliner_model
from services.heuristic import run_heuristic_detection

# 1. URLs for sample benchmark datasets (Raw text files)
DATASETS = {
    "CoNLL-2003 (News / Standard NER)": "https://raw.githubusercontent.com/davidsbatista/NER-datasets/master/CONLL2003/train.txt",
    "Enron Subset (Corporate Emails)": "https://raw.githubusercontent.com/crawles/enron-email-dataset/master/sample_emails.txt",
    "Medical / Clinical Notes (i2b2 Style)": "https://raw.githubusercontent.com/gliner/gliner_medical/main/sample_clinical_note.txt"
}

def fetch_dataset(url: str, max_chars: int = 50000) -> str:
    """Download a dataset and return up to max_chars as a single string."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            text = response.read().decode('utf-8', errors='ignore')
            return text[:max_chars]
    except Exception as e:
        # Fallback text if download fails
        print(f"    Failed to download from {url} ({e})")
        return "John Doe (johndoe@example.com) visited New York on 2023-01-01 and spent $500. His IP is 192.168.1.1." * 50

def run_benchmark():
    print("================================================")
    print(" CONSEAL PII REDACTION SPEED BENCHMARK ")
    print("================================================\n")
    
    print("Loading GLiNER Model into memory...")
    start_load = time.time()
    get_gliner_model()
    print(f"Model loaded in {time.time() - start_load:.2f} seconds.\n")

    for name, url in DATASETS.items():
        print(f"--- Benchmarking Dataset: {name} ---")
        print("Downloading sample...")
        text = fetch_dataset(url, max_chars=10000) # 10k chars per dataset for quick benchmarking
        char_count = len(text)
        print(f"Loaded {char_count} characters.")
        
        # 1. Benchmark GLiNER
        print("Running GLiNER Neural Inference...")
        gliner_start = time.time()
        gliner_dets = detect_pii_gliner(text, policy_name="mixed_general")
        gliner_time = time.time() - gliner_start
        
        # 2. Benchmark Heuristics
        print("Running Regex Heuristics...")
        heur_start = time.time()
        heur_dets = run_heuristic_detection(text)
        heur_time = time.time() - heur_start
        
        total_time = gliner_time + heur_time
        chars_per_sec = char_count / total_time if total_time > 0 else 0
        total_dets = len(gliner_dets) + len(heur_dets)
        
        print(f"\nResults for {name}:")
        print(f"  - GLiNER Time:     {gliner_time:.4f} sec")
        print(f"  - Heuristics Time: {heur_time:.4f} sec")
        print(f"  - Total Time:      {total_time:.4f} sec")
        print(f"  - Entities Found:  {total_dets}")
        print(f"  - Throughput:      {chars_per_sec:.0f} chars / sec")
        print("------------------------------------------------\n")

if __name__ == "__main__":
    run_benchmark()
