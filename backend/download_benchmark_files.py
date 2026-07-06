import os
import sys
from datasets import load_dataset

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "benchmark_data")
NUM_DOCS = 500

print(f"Creating output directory: {OUTPUT_DIR}")
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Downloading {NUM_DOCS} text files from HuggingFace (TinyStories)...")
try:
    dataset = load_dataset("roneneldan/TinyStories", split="train", streaming=True)
    
    count = 0
    for i, item in enumerate(dataset):
        if i >= NUM_DOCS:
            break
            
        file_path = os.path.join(OUTPUT_DIR, f"document_{i+1:03d}.txt")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(item["text"])
        
        count += 1
        if count % 100 == 0:
            print(f"  -> Saved {count} files...")
            
    print(f"\n✅ Successfully saved {count} files to: {OUTPUT_DIR}")
    print("You can now drag and drop this entire folder into the web UI!")

except Exception as e:
    print(f"Error downloading dataset: {e}")
    sys.exit(1)
