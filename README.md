# UniSystem

UniSystem is a multi-service university management project with:

- A Node.js backend API
- A FastAPI AI service for RAG and material workflows
- Qdrant vector storage with in-memory support
- Ollama local model integration
- PDF processing through PyMuPDF
- OCR support through Tesseract
- An optional standalone PDF file server
- A separate frontend app in `frontend/`

## Repository Safety

- Do not commit `.env` files.
- Do not commit local SQLite databases.
- Do not commit uploaded PDFs or generated Office files.
- Do not commit Ollama models.
- Each developer must run `ollama pull qwen2.5:1.5b-instruct` locally.

The root `.gitignore` is configured to ignore local environment files, databases, uploads, generated documents, logs, caches, and dependency folders.

## Setup

### 1. Clone repository

```bash
git clone <repo-url>
cd UniSystem
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend example environment:

```env
PORT=3000
JWT_SECRET=change_me
INTERNAL_API_KEY=change_me
AI_SERVICE_URL=http://localhost:9000
DATABASE_PATH=./database.sqlite
```

Optional note: email verification and password reset flows also need mail-related environment variables such as `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM_NAME`, and `BASE_URL`.

### 3. AI service setup

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 9000
```

AI service example environment:

```env
PORT=9000

BACKEND_API_URL=http://localhost:3000
INTERNAL_API_KEY=change_me

QDRANT_IN_MEMORY=true
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

OLLAMA_URL=http://localhost:11434
QWEN_MODEL=qwen2.5:1.5b-instruct

PDF_BASE_URL=http://localhost:3001
ENABLE_OCR=true
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe

ENABLE_MATERIAL_SUMMARY=false
PDF_CHUNK_SIZE=900
PDF_CHUNK_OVERLAP=150
```

### 4. Ollama setup

Install Ollama from `https://ollama.com`.

Pull the model:

```bash
ollama pull qwen2.5:1.5b-instruct
```

Make sure Ollama runs on:

```text
http://localhost:11434
```

### 5. Tesseract OCR setup

Install Tesseract OCR.

Default Windows path:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

Set in `.env`:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
ENABLE_OCR=true
```

### 6. PDF file server setup

```bash
cd pdf-file-server
npm install
cp .env.example .env
npm start
```

Files are served from `DOWNLOADS_DIR` and accessed like:

```text
http://localhost:3001/files/example.pdf
```

PDF file server example environment:

```env
PORT=3001
DOWNLOADS_DIR=C:\Users\ASUS\Downloads
```

### 7. RAG usage

Index a class:

```bash
curl -X POST http://127.0.0.1:9000/rag/index/class/1
```

Ask a question:

```bash
curl -X POST http://127.0.0.1:9000/rag/ask ^
-H "Content-Type: application/json" ^
-d "{\"class_id\":1,\"user_id\":1,\"question\":\"What is Fourier Transform?\"}"
```

Generate a summary:

```bash
curl -X POST http://127.0.0.1:9000/rag/material/summary ^
-H "Content-Type: application/json" ^
-d "{\"class_id\":1,\"material_id\":4,\"mode\":\"simple\"}"
```

## Optional Frontend

The frontend app lives in `frontend/` and can be started separately if you want the full UI:

```bash
cd frontend
npm install
npm run dev
```

## Git Status Safety Check

Run:

```bash
git status
```

Before pushing, confirm that `.env`, databases, PDFs, `node_modules`, `.venv`, and upload folders are not staged.

## Local Run Order

Start the services in this order for a typical local setup:

1. Start Ollama and pull `qwen2.5:1.5b-instruct`.
2. Start the backend on port `3000`.
3. Start the optional PDF file server on port `3001`.
4. Start the AI service on port `9000`.
5. Start the frontend if you want the web UI.
