# Conseal Hackathon Project (SprintFour 2026)

Conseal is a state-of-the-art desktop application built to anonymize and redact documents by automatically detecting, classifying, and protecting Personally Identifiable Information (PII). This allows sensitive enterprise documents to be safely shared with AI tools without leaking private data.

## Key Capabilities & Supported Formats

Conseal natively supports multi-format document ingestion and processing:
- **PDF Documents (`.pdf`)**: Layout extraction and interactive visual DOM rendering via `react-pdf` with real-time highlight synchronization.
- **Microsoft Word (`.docx`)**: Paragraph and table structure extraction with clean metadata sanitization.
- **Spreadsheets (`.xlsx`, `.xls`, `.csv`)**: Full multi-sheet Excel workbook and CSV table parsing via `openpyxl` and `pandas`, allowing cell-by-cell PII detection and redaction.
- **Plain Text (`.txt`)**: High-speed UTF-8 token analysis.

## Core Architectural Phases & Features

### 1. Dual-Layer AI Detection Engine
- **Transformer NLP Layer**: Integrated spaCy transformer model (`en_core_web_trf`) and Microsoft Presidio for contextual entity extraction (PERSON, EMAIL, PHONE, SSN, CREDIT_CARD, MEDICAL_LICENSE, etc.).
- **Heuristic & Regex Layer**: High-precision fallback matching rules with word-boundary alignment to ensure exact character offsets.

### 2. Interactive Review Workspace
- **Draggable & Floatable Reasoning Panel**: The Reasoning & Triage window can be docked to the sidebar, minimized into a floating pill (`⚡ Show Reasoning & Triage`), or detached into a draggable popover window positioned anywhere on the screen.
- **Bidirectional Highlight Synchronization**: Selecting any word or entity in the Interactive Parsed View immediately highlights and pulses the matching text string directly inside the Original PDF Layout Preview using `react-pdf`.
- **Per-Document Security Mode**: Users can toggle between **Redact (Blackout)** and **Anonymize ([Tag])** modes per file on upload or on individual entities.

### 3. Export & Sanitization
- Exports clean documents in their native format (`.pdf`, `.docx`, `.xlsx`, `.csv`, `.txt`).
- Strips hidden file metadata (author, title, creation history) via `X-Stripped-Metadata` headers.

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
