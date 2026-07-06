import os
import sys
import glob

# Try importing, otherwise fail gracefully
try:
    from docx import Document
    from fpdf import FPDF
except ImportError:
    print("Missing requirements. Please run: pip install python-docx fpdf2")
    sys.exit(1)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "benchmark_data")

# Get all txt files
txt_files = glob.glob(os.path.join(OUTPUT_DIR, "*.txt"))
txt_files.sort()

if not txt_files:
    print("No .txt files found in benchmark_data.")
    sys.exit(1)

total = len(txt_files)
print(f"Found {total} text files. Converting to mixed formats...")

# Split into three roughly equal chunks
chunk_size = total // 3
to_pdf = txt_files[:chunk_size]
to_docx = txt_files[chunk_size:2*chunk_size]
to_keep_txt = txt_files[2*chunk_size:]

print(f"Goal: {len(to_pdf)} PDFs, {len(to_docx)} DOCXs, {len(to_keep_txt)} TXTs.")

def create_pdf(txt_path):
    with open(txt_path, "r", encoding="utf-8") as f:
        text = f.read()
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    # Using multi_cell to handle wrapping and newlines
    # Need to handle encoding carefully, FPDF uses latin-1 by default but supports utf-8 in fpdf2
    pdf.multi_cell(0, 10, txt=text)
    
    new_path = txt_path.replace(".txt", ".pdf")
    pdf.output(new_path)
    os.remove(txt_path)

def create_docx(txt_path):
    with open(txt_path, "r", encoding="utf-8") as f:
        text = f.read()
        
    doc = Document()
    doc.add_paragraph(text)
    
    new_path = txt_path.replace(".txt", ".docx")
    doc.save(new_path)
    os.remove(txt_path)

# Process PDFs
print("Converting to PDFs...")
for path in to_pdf:
    try:
        create_pdf(path)
    except Exception as e:
        print(f"Error converting to PDF {path}: {e}")

# Process DOCXs
print("Converting to DOCXs...")
for path in to_docx:
    try:
        create_docx(path)
    except Exception as e:
        print(f"Error converting to DOCX {path}: {e}")

print("\nFinished converting files!")
print(f"Your folder now contains a mix of PDF, DOCX, and TXT files.")
