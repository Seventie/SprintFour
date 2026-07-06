# Conseal Hackathon Project (SprintFour 2026)

# 🎥 Submission Video
> **📺 Watch the 5-Minute Demo here:**  
> [https://drive.google.com/file/d/1xs1eIhO1er10vgzYdQZVjmuFyPA6jSVv/view](https://drive.google.com/file/d/1xs1eIhO1er10vgzYdQZVjmuFyPA6jSVv/view)

Conseal is a state-of-the-art desktop application built to anonymize and redact documents by automatically detecting, classifying, and protecting Personally Identifiable Information (PII). This allows sensitive enterprise documents to be safely shared with AI tools without leaking private data.

---

## 🚀 How This Solves The Hackathon Prompt

We engineered specific solutions for the 3 core personas in the prompt:

### **Problem 1: Trust and explainability (Marcus)**
*Marcus won't adopt a tool he has to take on faith. He wants to know why something was hidden or kept.*
- **Solution:** 100% Local-First processing ensures zero data leakage. We built an interactive **Reasoning Engine**: clicking *any* word (hidden or kept) reveals exactly why the ML classified it that way, building instant trust through transparency.

### **Problem 2: Working at volume (Maya)**
*Maya is a paralegal with 200 case files under extreme time pressure.*
- **Solution:** We dropped slow cloud APIs in favor of **ONNX-optimized GLiNER** running on asynchronous FastAPI thread pools. To handle massive PDFs without blowing out RAM, we stream documents page-by-layer (PyMuPDF) and dynamically scale processing across all available CPU cores.

### **Problem 3: Fixing the tool's mistakes (Sam)**
*Sam trusts the tool too much and moves fast, missing false positives and false negatives.*
- **Solution:** We built a brutalist, **100% Keyboard-Driven UI** with bi-directional syncing. Sam can fly through 200 documents instantly using global hotkeys (`Ctrl+Shift+A` to bulk accept everything above 85% confidence, `Shift+D` to reject a file). If he spots an error, `Ctrl+Z` undoes even massive cross-file bulk actions instantly. 

---

## 🛠️ Core Architectural Highlights

1. **ONNX-Optimized GLiNER (Zero-Shot ML):** Dropped the 2GB+ PyTorch dependency for lightweight, instant-start ONNX runtime. Unlike Regex, GLiNER understands bidirectional context (knowing "Chase" is a bank, not a person).
2. **Surgical XML Injection (DOCX):** Instead of highlighting entire paragraphs (run-bleeding), we wrote a custom algorithm directly on the underlying `lxml` tree to surgically split runs at exact character indices, guaranteeing pixel-perfect DOCX redactions without formatting corruption.
3. **Smart Memory Management:** Heavy OCR models can cause OOM crashes. Our FastAPI workers use chunked streaming to process images page-by-page, allowing the Python garbage collector to free memory between chunks.

---

## 💻 Getting Started & Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- **FOUR (4) Terminal Windows** must be launched concurrently for the parallel architecture to work correctly.

### Terminal 1: Backend API Server
```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
uvicorn main:app --reload --port 8000
```
> **Note on First Run:** The very first time you upload a document, the backend will automatically download the ONNX GLiNER weights (about ~300MB). It may take 10-20 seconds for the very first file to process. Subsequent files will process in milliseconds.

### Terminal 2: Frontend Setup (React & Vite)
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev
```
> The web application will be available at `http://localhost:5173`.

### Terminal 3 & 4: Distributed ML Workers (Parallel Processing)
To achieve the high-speed volume processing demonstrated in the video, you must launch two additional ML worker nodes to share the load.
```bash
# In BOTH Terminal 3 and Terminal 4, run:
cd backend
# Activate the same virtual environment
.\.venv\Scripts\activate  # (or source .venv/bin/activate on Mac/Linux)

# Launch the dedicated batch worker processes
python -m services.worker_pool
```
> **Note:** These workers will connect to the primary API server and pick up chunks of the PDF processing queue to prevent Out-Of-Memory errors.

---

## 🧪 Test Sample Suite
To quickly benchmark and validate the system, we have generated **12 brand new, highly complex official documents** spanning Medical, Legal, HR, Finance, and IT Security. 

They are located in the root directory folder:
📁 `sample_official_docs/`

These contain names, SSNs, phone numbers, addresses, emails, credit cards, bank routing numbers, and URLs—perfect for testing the mixed GLiNER + regex PII policies! Simply drag and drop any of these files into the upload screen to test the system.
