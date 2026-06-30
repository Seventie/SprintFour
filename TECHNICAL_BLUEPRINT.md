# Conseal Hackathon — Full Technical Blueprint

> **Problem:** Problems 1 (Trust & Explainability) + 3 (Fixing the Tool's Mistakes) merged
> **App:** A document PII review workspace — upload documents, inspect and correct AI-suggested redactions, understand every decision, export a clean version.

---

## 1. What We Are Building

A full-stack web application with four screens:

1. **Landing Page** — product explanation, CTA to get started
2. **Upload Page** — drag-drop single or multiple files (DOCX / PDF / TXT)
3. **Review Workspace** — the core experience: document viewer with inline highlights, inspection panel, correction actions, file sidebar
4. **Export Page** — final summary, per-file stats, download redacted files

**No login. No database. No persistent storage. Single session, in-memory only.**

---

## 2. Tech Stack — Every Decision Justified

### 2.1 Frontend

| Technology | Version | Role | Why Not Alternatives |
|---|---|---|---|
| **React** | 18.3 | UI framework | Component model suits the multi-panel workspace perfectly. Vue would work but React ecosystem is wider. |
| **Vite** | 5.x | Build tool + dev server | Instant HMR, near-zero config. Next.js is overkill — no SSR needed here. CRA is deprecated. |
| **Tailwind CSS** | 3.4 | Styling | Fastest consistent UI in a hackathon. No context switching to CSS files. |
| **React Router** | 6.x | Client-side routing | 4 simple pages, hash routing works. TanStack Router is overkill for this scope. |
| **Axios** | 1.7 | HTTP client | Cleaner than fetch for multipart file uploads, interceptors, and error handling. |
| **Lucide React** | latest | Icons | Tree-shakeable, clean SVG, consistent 24px grid. |

**State management: `useReducer` (no external library)**

The review workspace has many interconnected actions. `useReducer` with a clear action/dispatch pattern keeps state predictable and debuggable without the overhead of Redux or Zustand.

```
State shape:
{
  documents: [],              // all uploaded files + metadata
  activeDocId: null,          // which file is currently open
  detections: {},             // docId → Detection[]
  corrections: {},            // docId → { detectionId → newStatus }
  flagged: {},                // docId → detectionId[]
  history: [],                // undo stack — last 20 actions
  sidebarOpen: true
}

Actions:
  UPLOAD_FILES
  SET_ACTIVE_DOC
  SET_DETECTIONS
  ACCEPT_DETECTION
  REJECT_DETECTION       (remove false positive)
  FLAG_DETECTION         (save for later)
  ADD_DETECTION          (user manually marks text as PII)
  BULK_ACCEPT            (accept all above confidence threshold)
  UNDO
  TOGGLE_SIDEBAR
```

---

### 2.2 Backend

| Technology | Version | Role | Why Not Alternatives |
|---|---|---|---|
| **Python** | 3.11+ | Language | ML ecosystem, all parsing libraries live here. |
| **FastAPI** | 0.111 | Web framework | Async, auto-generates OpenAPI docs at /docs, Pydantic validation built-in. Flask is synchronous and lacks schema validation. Django is too heavy. |
| **Uvicorn** | 0.29 | ASGI server | Standard production-ready server for FastAPI. |
| **Pydantic v2** | 2.7 | Schema validation | Request/response validation, enum types, field constraints. Built into FastAPI. |
| **python-docx** | 1.1 | DOCX parsing + export | Access to paragraph and run level — critical for span-accurate redaction. |
| **PyMuPDF (fitz)** | 1.24 | PDF parsing + export | `get_text("dict")` gives bbox coordinates per span. `apply_redactions()` permanently removes underlying text — not just a visual overlay. |
| **python-multipart** | 0.0.9 | File upload support | Required by FastAPI for multipart/form-data. |
| **python-dotenv** | 1.0 | Env vars | For optional OpenAI API key management. |
| **openai** | 1.30 | Optional LLM detection | Only used if mock backend is not enough. Not required for demo. |

---

### 2.3 Database

**None. Intentional.**

All state lives in Python dicts in memory for the duration of the server process:

```python
# state.py
documents:   dict[str, DocumentRecord]        = {}
detections:  dict[str, list[Detection]]       = {}
corrections: dict[str, dict[str, str]]        = {}
raw_files:   dict[str, bytes]                 = {}   # original file bytes for export
structures:  dict[str, list[StructureNode]]   = {}
```

**Why no DB:**
- No setup time (no Postgres, no migrations, no SQLAlchemy config)
- Documents do not need to persist across server restarts for a demo
- Judges will not restart your server mid-presentation
- Scope stays tight — the problem is about the UX, not the infrastructure

**If you productionize later:** SQLite + SQLAlchemy for single-user, Postgres for multi-user.

---

## 3. Project Folder Structure

```
conseal/
├── README.md
├── .env.example
│
├── backend/
│   ├── main.py                    ← FastAPI app entry, all route registrations
│   ├── requirements.txt
│   ├── state.py                   ← in-memory store (dicts)
│   │
│   ├── models/
│   │   └── schemas.py             ← All Pydantic models
│   │
│   ├── services/
│   │   ├── file_parser.py         ← DOCX / PDF / TXT → flat text + StructureNode list
│   │   ├── pii_detector.py        ← regex patterns + optional LLM call
│   │   ├── span_mapper.py         ← flat char spans → document structure positions
│   │   └── redaction_engine.py    ← applies confirmed redactions, reconstructs file
│   │
│   ├── routers/
│   │   ├── upload.py              ← POST /api/upload
│   │   ├── documents.py           ← GET /api/document/{doc_id}
│   │   ├── detections.py          ← PATCH, POST, DELETE /api/detection/...
│   │   └── export.py              ← POST /api/export/{doc_id}
│   │
│   └── data/
│       └── mock_detections.json   ← hardcoded PII spans for demo mode
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    │
    └── src/
        ├── main.jsx
        ├── App.jsx                 ← Router + global layout
        │
        ├── pages/
        │   ├── Landing.jsx
        │   ├── Upload.jsx
        │   ├── Review.jsx          ← most complex, imports all review components
        │   └── Export.jsx
        │
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.jsx
        │   │   └── PageWrapper.jsx
        │   │
        │   ├── upload/
        │   │   ├── DropZone.jsx
        │   │   └── FileList.jsx
        │   │
        │   ├── review/
        │   │   ├── DocumentViewer.jsx    ← renders text, injects highlight spans
        │   │   ├── HighlightSpan.jsx     ← single highlighted PII span
        │   │   ├── InspectionPanel.jsx   ← right panel: type, confidence, actions
        │   │   ├── FileSidebar.jsx       ← left panel: file list with status
        │   │   ├── SummaryBar.jsx        ← top: counts + bulk actions
        │   │   └── FlaggedList.jsx       ← items saved for later
        │   │
        │   └── export/
        │       ├── ExportSummary.jsx
        │       └── DownloadButton.jsx
        │
        ├── context/
        │   └── ReviewContext.jsx         ← useReducer + Context provider
        │
        ├── hooks/
        │   └── useReviewState.js         ← reducer logic isolated here
        │
        ├── api/
        │   └── client.js                 ← all axios calls to backend
        │
        └── utils/
            ├── highlightUtils.js         ← span overlap detection, sort, merge
            └── statusColors.js           ← maps status → Tailwind color class
```

---

## 4. Data Models — Full Pydantic Schema

```python
# models/schemas.py

from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional
import uuid

class PIIType(str, Enum):
    NAME     = "NAME"
    PHONE    = "PHONE"
    EMAIL    = "EMAIL"
    ADDRESS  = "ADDRESS"
    DATE     = "DATE"
    ID       = "ID"
    PAN      = "PAN"
    AADHAAR  = "AADHAAR"
    IP       = "IP"
    CUSTOM   = "CUSTOM"     # user manually added

class DetectionStatus(str, Enum):
    REDACTED       = "redacted"         # tool flagged, high confidence, accepted
    MISSED         = "missed"           # tool missed, needs user action
    FALSE_POSITIVE = "false_positive"   # tool over-flagged, user can dismiss
    FLAGGED        = "flagged"          # user saved for later review
    ADDED          = "added"            # user manually added
    DISMISSED      = "dismissed"        # user confirmed: not PII

class FileStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    READY      = "ready"
    ERROR      = "error"

class Detection(BaseModel):
    id:         str   = Field(default_factory=lambda: str(uuid.uuid4()))
    text:       str
    char_start: int
    char_end:   int
    type:       PIIType
    confidence: float               # 0.0 – 1.0
    status:     DetectionStatus
    reason:     str                 # human-readable explanation

class StructureNode(BaseModel):
    char_start: int
    char_end:   int
    text:       str
    para_idx:   Optional[int]   = None   # DOCX
    run_idx:    Optional[int]   = None   # DOCX
    page_num:   Optional[int]   = None   # PDF
    bbox:       Optional[tuple] = None   # PDF: (x0, y0, x1, y1)

class DocumentRecord(BaseModel):
    doc_id:     str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename:   str
    file_type:  str                      # "docx" | "pdf" | "txt"
    status:     FileStatus
    plain_text: str = ""
    char_count: int = 0

class UploadResponse(BaseModel):
    documents: list[DocumentRecord]

class DocumentResponse(BaseModel):
    doc_id:     str
    filename:   str
    plain_text: str
    structure:  list[StructureNode]
    detections: list[Detection]

class CorrectionRequest(BaseModel):
    status: DetectionStatus

class AddDetectionRequest(BaseModel):
    text:       str
    char_start: int
    char_end:   int
    type:       PIIType
    reason:     str = "Manually added by user"

class ExportRequest(BaseModel):
    format:               str              # "txt" | "docx" | "pdf"
    confirmed_detections: list[Detection]
```

---

## 5. API Endpoints — Full Contract

### `POST /api/upload`
```
Request:  multipart/form-data { files: File[] }
Response: UploadResponse { documents: [DocumentRecord] }

Side effects:
  - Parses each file → plain_text + structure
  - Runs PII detector → stores detections
  - Stores raw file bytes for later export
  - Returns immediately with doc_ids and status
```

### `GET /api/document/{doc_id}`
```
Response: DocumentResponse {
  doc_id, filename, plain_text,
  structure: [StructureNode],
  detections: [Detection]
}
```

### `PATCH /api/detection/{detection_id}`
```
Request:  CorrectionRequest { status: DetectionStatus }
Response: { ok: true, detection: Detection }
Used for: accept, reject, flag, dismiss a detection
```

### `POST /api/detection/{doc_id}`
```
Request:  AddDetectionRequest
Response: { ok: true, detection: Detection }
Used for: user manually selects text and marks it as PII
```

### `DELETE /api/detection/{detection_id}`
```
Response: { ok: true }
Used for: removing a manually added detection
```

### `POST /api/export/{doc_id}`
```
Request:  ExportRequest { format, confirmed_detections }
Response: File download stream (application/octet-stream)
          Content-Disposition: attachment; filename="redacted_{filename}"

Process:
  1. Load original file bytes from raw_files[doc_id]
  2. Run redaction_engine with confirmed_detections
  3. Stream redacted file
```

### `GET /api/health`
```
Response: { status: "ok", version: "1.0.0" }
```

---

## 6. Backend Services — Detailed Workflow

### `file_parser.py`

**Input:** raw file bytes + file extension
**Output:** `(plain_text: str, structure: list[StructureNode])`

**DOCX:**
1. Open with `python-docx` via `BytesIO`
2. Iterate `doc.paragraphs` → each `paragraph.runs`
3. For each run record: `char_start`, `char_end`, `para_idx`, `run_idx`, `text`
4. Append `\n` between paragraphs
5. Return flat text + structure list

**PDF:**
1. Open with `fitz.open(stream=bytes, filetype="pdf")`
2. Per page: `page.get_text("dict")` → blocks → lines → spans
3. Each span has `text` + `bbox (x0, y0, x1, y1)`
4. Record `char_start`, `char_end`, `page_num`, `bbox` per span
5. Return flat text + structure list

**TXT:**
1. Decode bytes as UTF-8
2. Return as-is, no structure needed

---

### `pii_detector.py`

**Input:** `plain_text`, `doc_id`
**Output:** `list[Detection]`

**Regex layer (always runs):**
```python
PATTERNS = {
    "EMAIL":   (r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", 0.97),
    "PHONE":   (r"(\+91[\-\s]?)?[6-9]\d{9}", 0.92),
    "PAN":     (r"[A-Z]{5}[0-9]{4}[A-Z]", 0.99),
    "AADHAAR": (r"\d{4}\s\d{4}\s\d{4}", 0.98),
    "DATE":    (r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", 0.60),
    "IP":      (r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", 0.85),
}
```
Each match → Detection with `status="redacted"` and confidence from table above.

**Mock layer (for demo):**
Loads `data/mock_detections.json` which includes:
- 2 high-confidence correctly flagged items (name, email)
- 1 false positive (e.g. "Monday" as DATE, confidence 0.30)
- 1 deliberately missed phone number (confidence below threshold)
- 2 medium-confidence uncertain items (partial address)

**Optional LLM layer (if `OPENAI_API_KEY` set):**
Used for NAME and ADDRESS detection only. Simple prompt returning JSON array. Falls back to mock if key not present.

---

### `span_mapper.py`

**Input:** `Detection`, `list[StructureNode]`
**Output:** `list[StructureNode]` overlapping the detection's char span

**Algorithm:**
```
For each detection (char_start, char_end):
  nodes = [n for n in structure
           if n.char_start < detection.char_end
           and n.char_end > detection.char_start]
  return nodes with split offsets for partial overlaps
```

This is what connects the flat detector output back to the exact run in DOCX or bbox in PDF.

---

### `redaction_engine.py`

**Input:** original file bytes, confirmed detections, structure nodes
**Output:** redacted file bytes

**DOCX:**
```
1. Open with python-docx
2. For each detection → find overlapping runs via span_mapper
3. If detection covers entire run → run.text = "[TYPE]"
4. If detection is partial → split run into prefix + "[TYPE]" + suffix
   (python-docx allows direct run.text mutation)
5. Save to BytesIO → return bytes
```

**PDF:**
```
1. Open with fitz
2. For each detection → get page_num + bbox from structure nodes
3. page.add_redact_annot(bbox, text="[TYPE]")
4. page.apply_redactions()  ← CRITICAL: permanently removes underlying text
   (without this, text is visually hidden but still extractable)
5. Save to BytesIO → return bytes
```

**TXT:**
```
Sort detections by char_start DESCENDING
Replace each span back-to-front (preserves earlier char positions)
"Call John at 9876543210" → "Call [NAME] at [PHONE]"
```

---

## 7. Frontend Components — What Each One Does

### `DocumentViewer.jsx`
The hardest frontend component. Takes `plain_text` + `detections` and renders them together.

```
Algorithm:
1. Sort detections by char_start ascending
2. Merge overlapping detections (keep higher confidence)
3. Walk plain_text:
   - Before first detection → plain string node
   - At char_start → open HighlightSpan
   - At char_end → close HighlightSpan, continue plain text
   - Newlines → <br /> or paragraph wrapper
4. Result: array of [string | HighlightSpan] → render as div
```

Never split a detection mid-word at render time. Detections from backend are already word-aligned.

---

### `HighlightSpan.jsx`
A `<mark>` wrapping flagged text. Props: `detection`, `isActive`, `onClick`

Color by status:
- `missed` → red bg + pulsing border ring
- `false_positive` → amber bg
- `redacted` → teal/gray bg
- `flagged` → purple bg
- `added` → blue bg (manually added)

On hover → mini tooltip: type + confidence %
On click → `setActiveDetection(detection)` → triggers InspectionPanel

---

### `InspectionPanel.jsx`
Right side panel. Sections:
1. Type badge (NAME / PHONE etc.) in color
2. Confidence bar — visual 0–100%
3. Reason text — "Matches 10-digit Indian mobile number pattern"
4. Original flagged text quoted
5. Action buttons:
   - `missed` → "Redact this" + "Not PII"
   - `false_positive` → "Remove redaction" + "Keep redacted"
   - `redacted` → "Undo"
   - All → "Flag for later"
6. Flagged list at bottom with "Review now" per item

---

### `SummaryBar.jsx`
Top bar, always visible.

Left: filename + file type badge
Center: 🔴 N missed · 🟡 N uncertain · ✅ N accepted · 🚩 N flagged
Right:
- "Accept all high-confidence (>85%)" button
- "Confirm & Export" — disabled while `missed > 0`
  Shows tooltip: "Resolve N missed items first" when disabled

---

### `FileSidebar.jsx`
Left sidebar, collapsible.

Each file: filename, file type icon, status badge (✅ Clean / 🟡 Needs review / 🔴 Has missed PII)
Click → switch `activeDocId`
Collapse → icon-only rail

---

### `ReviewContext.jsx`
Wraps the Review page. Provides state + dispatch to all child components via Context.

```js
const initialState = {
  documents: [],
  activeDocId: null,
  detections: {},
  corrections: {},
  flagged: {},
  history: [],
  sidebarOpen: true
}
```

Every correction (accept/reject/flag/undo) dispatches an action AND calls the backend PATCH endpoint.

---

## 8. Trickiest Engineering Problems

| Priority | Problem | Solution |
|---|---|---|
| 🔴 Critical | Detection spanning multiple DOCX runs | Split runs at detection boundaries. Walk runs left-to-right, split any partially overlapping run, replace middle section only. |
| 🔴 Critical | Char offset drift from text extraction | Use identical whitespace normalization in both parser and detector. Never re-normalize after position map is built. |
| 🟡 Important | Overlapping detections in DocumentViewer | Sort by char_start, merge overlapping spans, keep higher confidence. Never render nested mark elements. |
| 🟡 Important | PDF redaction on image-based pages | Detect pages where get_text() returns empty. Warn user: "Page N is a scanned image — text redaction not supported." |
| 🟢 Standard | Undo after bulk accept | History stack in reducer. Bulk action = one history entry with all changed IDs + previous statuses. Undo pops one entry, restores all. |
| 🟢 Standard | Export gate | Derived: `missedCount = detections[activeDocId].filter(d => d.status === "missed").length`. Button disabled when > 0. |

---

## 9. Key UX Decisions That Win Points

**Missed PII > False Positives in urgency**
Red with pulse animation for missed, amber for false positives. Visual hierarchy matches real-world risk.

**Confidence threshold slider**
"Show only items below X% confidence" — fast user focuses only on uncertain detections.

**Export gate with tooltip**
"Confirm & Export" disabled until missed = 0. Tooltip explains why. Flagged items = soft warning only.

**Zero missed PII badge on export page**
Explicit: "✅ 0 missed PII items remaining". Answers Marcus's trust question without requiring faith.

**Undo toast, not confirmation dialogs**
5-second undo toast after every destructive action. No "Are you sure?" modals — they kill review speed.

**Manual text selection**
Select any text → context menu → "Mark as PII" → choose type. Covers tool blind spots entirely.

**`apply_redactions()` on PDF export**
Permanently burns redaction into PDF, removes underlying text. Without this, PDF looks redacted but text is still extractable — directly addresses Marcus's fear of "information still underneath."

---

## 10. Mock Document — What It Must Cover

The sample document must contain all detection scenarios in one file:

| Text | Type | Status | Confidence |
|---|---|---|---|
| "Arjun Sharma" | NAME | redacted | 0.95 |
| "arjun.sharma@lawfirm.in" | EMAIL | redacted | 0.97 |
| "9876543210" (no country code) | PHONE | missed | 0.38 |
| "Monday" | DATE | false_positive | 0.28 |
| "12/03/1990" | DATE | redacted | 0.91 |
| "ABCDE1234F" (PAN) | PAN | redacted | 0.99 |
| "123 MG Road, Bangalore" | ADDRESS | false_positive (low conf) | 0.52 |
| "192.168.1.1" | IP | redacted | 0.85 |

This single document exercises every highlight color, every action button, and every edge case in one demo.

---

## 11. Requirements Files

**`backend/requirements.txt`**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
pydantic==2.7.1
python-docx==1.1.2
PyMuPDF==1.24.3
openai==1.30.0
python-dotenv==1.0.1
```

**`frontend/package.json` (dependencies)**
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.23.1",
  "axios": "^1.7.2",
  "lucide-react": "^0.395.0"
}
```

---

## 12. Running the App

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Swagger docs at http://localhost:8000/docs

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

---

## 13. Hour-by-Hour Build Order

| Time | Task | Deliverable |
|---|---|---|
| 0:00–0:30 | Repo init, Vite + React + Tailwind, FastAPI boilerplate, CORS | Both servers running, hello world |
| 0:30–1:00 | Pydantic schemas, state.py, mock_detections.json | Data layer ready |
| 1:00–1:30 | file_parser.py (TXT first, DOCX second, PDF last) + upload endpoint | File upload working |
| 1:30–2:15 | pii_detector.py — regex + mock fallback + detect endpoint | Detection endpoint working |
| 2:15–3:00 | Landing page + Upload page frontend | Two pages done |
| 3:00–5:30 | Review Workspace: DocumentViewer + HighlightSpan + InspectionPanel + SummaryBar | Core experience done |
| 5:30–6:00 | FileSidebar + ReviewContext + all correction actions wired to API | Multi-file flow done |
| 6:00–6:30 | span_mapper + redaction_engine (TXT → DOCX → PDF) + export endpoint | Export working |
| 6:30–7:00 | Export page + download + per-file summary | Full end-to-end flow done |
| 7:00–7:30 | Edge cases: undo toast, export gate, flagged warning, empty state, confidence filter | Polish done |
| 7:30–8:00 | README, half-page writeup, final cleanup | Submission ready |

---

## 14. Writeup Template

**What you built:**
A document PII review workspace merging Problem 1 (explainability) and Problem 3 (correction). Every detection shows its type, confidence score, and human-readable reason. Users can accept, reject, manually add, or flag detections before exporting a truly redacted document.

**What you chose NOT to build and why:**
- No login — unnecessary for a single-session tool, adds friction with zero demo value
- No database — in-memory is correct for this scope; persistence adds setup time with no benefit
- No custom ML model — the problem is the UX around imperfect detection, not the detector itself
- No mobile layout — the review workspace requires a split-panel layout that only works on desktop
- No batch pipeline (Problem 2 / Maya) — scoped out deliberately to keep Problems 1+3 deep rather than spreading thin

**Hard cases noticed:**
- Missed PII is more dangerous than false positives → separate visual urgency hierarchy (red pulse vs amber)
- `apply_redactions()` required for PDFs to truly remove underlying text, not just overlay a black box
- Export gate prevents exporting while missed items remain unresolved
- Manual text selection covers PII types the tool has no pattern for
- Undo stack prevents fast-click mistakes from being permanent

---

*End of Technical Blueprint*
