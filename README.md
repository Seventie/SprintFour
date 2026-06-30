# Conseal Hackathon Project (SprintFour 2026)

Conseal is a desktop application built to anonymize documents by automatically redacting or labeling personally identifying information (PII). This allows documents to be safely shared with AI tools without leaking private data. 

For this hackathon, we built a full-stack prototype focused on a robust **Review Workspace** and **Redaction Engine**.

## Phase 1: Git & Backend Foundation
- A stateless FastAPI backend architecture designed for zero data retention.
- `state.py` handles mock session data to simulate processing constraints without needing a DB.
- Comprehensive REST APIs for upload, retrieval, and exporting.

## Phase 2: Frontend Foundation & Upload Flow
- React + Vite + Tailwind CSS (v4) setup.
- Developed an uncompromising **Cyber-Brutalism + Systematic Minimalism** UI/UX.
- The `Upload.jsx` view strictly enforces local, in-memory guarantees with warning flags.

## Phase 3: The Review Workspace
- **DocumentViewer**: Interactive token-level rendering of text, overlaying the model's predictions.
- **InspectionPanel**: Offers a detailed view of confidence scores, extraction logic, and source context for each PII match.
- **SummaryBar**: Blocks the user from exporting until all `missed` or `uncertain` entities are resolved. Tracks real-time session progress.

## Phase 4: Redaction Engine & Export
- Backend `export.py` router takes the final state of all human-reviewed labels and accurately replaces the source strings with explicit `[PII_TYPE]` tokens.
- Frontend directly triggers a secure download blob with the final output.

## How to Run

### 1. Backend
```bash
cd backend
python -m venv venv
# Activate your venv
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs on `http://localhost:8000`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.
