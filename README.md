# Conseal Hackathon Project (SprintFour 2026)

# 🎥 Submission Video
> **📺 Watch the demo here:**  
> https://drive.google.com/file/d/1-TqqX5580QTegjAQ57R-Ow2sAbxGR3dm/view?usp=sharing

> **⚡ Recommended:** Watch the video at **2× playback speed** for a faster walkthrough, as the demo got long. Sorry :-<

## ▶️ How to Watch at 1.75× Speed (Google Drive)

1. Open the video using the link above.
2. Click **View** in the top menu.
3. Select **Playback speed**.
4. Choose **1.75×**.

---

> 💡 **Tip:** The video covers the complete workflow, architecture, implementation, and key features of our solution.

Conseal is a state-of-the-art desktop application built to anonymize and redact documents by automatically detecting, classifying, and protecting Personally Identifiable Information (PII). This allows sensitive enterprise documents to be safely shared with AI tools without leaking private data.

## Key Capabilities & Supported Formats

Conseal natively supports multi-format document ingestion and processing:
- **PDF Documents (`.pdf`)**: Layout extraction and interactive visual DOM rendering via `react-pdf` with real-time highlight synchronization and clickable link removal.
- **Microsoft Word (`.docx`)**: Paragraph and table structure extraction with clean metadata sanitization.
- **Spreadsheets (`.xlsx`, `.xls`, `.csv`)**: Full multi-sheet Excel workbook and CSV table parsing via `openpyxl` and `pandas`, allowing cell-by-cell PII detection and redaction.
- **Plain Text (`.txt`)**: High-speed UTF-8 token analysis.

## Core Architectural Features & UI/UX Innovations

### 1. Dual-Layer AI Detection Engine with spaCy Token Precision
- **Transformer NLP Layer**: Integrated spaCy transformer model (`en_core_web_trf`) and Microsoft Presidio for exact word-boundary entity extraction (PERSON, EMAIL, PHONE, SSN, CREDIT_CARD, MEDICAL_LICENSE, etc.).
- **Heuristic & Regex Layer**: High-precision fallback matching rules with strict word-boundary alignment so tokens never get cut in half.

### 2. Interactive Review Workspace & Custom Renaming
- **Custom Synthetic Renaming / On-the-Fly Editing**: Users can click any detected or anonymized word and rename its synthetic label (e.g., rename `[John Doe]` to `[Client A]` or `[CEO]`).
- **High-Speed Keyboard Shortcuts**: Reviewers can process documents at lightning speed without touching the mouse:
  - `R` or `1`: Redact active item (Blackout)
  - `A` or `2`: Anonymize active item (Synthetic Tag)
  - `D` or `3`: Dismiss active item (Keep safe)
  - `Tab` or `N` / `ArrowRight`: Jump to next unreviewed item
  - `Ctrl + Z`: Undo last action
- **Draggable & Floatable Reasoning Panel**: The Reasoning & Triage window can be docked to the sidebar, minimized into a floating pill (`⚡ Show Reasoning & Triage`), or detached into a draggable popover window positioned anywhere on the screen.
- **Bidirectional Highlight Synchronization**: Selecting any word or entity in the Interactive Parsed View immediately highlights and pulses the matching text string directly inside the Original PDF Layout Preview using `react-pdf`.
- **Per-Document & Per-Entity Security Mode**: Users can toggle between **Redact (Blackout)** and **Anonymize ([Tag])** modes on the file upload card or individual detections.

### 3. Total Export Sanitization & Security Audit Checklist
- Exports clean documents in their native format (`.pdf`, `.docx`, `.xlsx`, `.csv`, `.txt`).
- **Hidden Hyperlink & URI Neutralization**: Automatically identifies and deletes hidden clickable tracking links inside PDFs during redaction export.
- **Metadata Sanitization**: Strips document metadata (author, title, creation dates, revision history) and provides explicit verification badges on the Export Hub screen.

## Test Sample Suite (`test_samples/`)

To quickly benchmark and validate the system across various real-world scenarios, 6 realistic test documents are included in the `test_samples/` directory:
1. `Sample_Financial_Report_2026.pdf`: Formal audit report with executive compensation, SSNs, credit cards, and IP addresses.
2. `Sample_Confidential_Letter.pdf`: Legal severance agreement with driver license numbers, bank routing codes, and personal addresses.
3. `Sample_Executive_Memo.docx`: Internal board memorandum with wire routing numbers and sensitive attorney contact lines.
4. `Sample_Medical_Notes.docx`: Clinical discharge summary with patient MRNs, physician medical license IDs, and insurance policy codes.
5. `Sample_Customer_List.txt`: UTF-8 customer roster with credit card numbers and IP addresses.
6. `Sample_Employee_Payroll.csv`: Spreadsheet with employee payroll, SSNs, and direct deposit details.

## How to Run Locally

### 1. Backend Service
```bash
cd backend
python -m venv venv
# Activate virtual environment (e.g., .\venv\Scripts\activate on Windows)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API Documentation available at `http://localhost:8000/docs`.

### 2. Frontend Web Client
```bash
cd frontend
npm install
npm run dev
```
Web Application runs on `http://localhost:5173`.
