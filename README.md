# UniSystem — AI-Enhanced University Management System

A full-stack Learning Management System with RAG-powered AI features: class Q&A, Study-with-AI tools (summary, notes, quiz, flashcards), persistent AI outputs, and class-scoped notifications.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.11-009688?logo=fastapi)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Ollama](https://img.shields.io/badge/Ollama-Qwen2.5-black)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  React + TypeScript + Vite  (port 5173)                     │
│  ClassStreamTab · ClassMaterialsTab · TopNav notifications  │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP / Axios
┌───────────────────▼─────────────────────────────────────────┐
│  Node.js / Express  (port 3000)                             │
│  JWT auth · Discussion · StudyOutput · Notification         │
│  SQLite: Questions · Answer · StudyOutput · Notification    │
└───────────┬─────────────────────────────────────────────────┘
            │ Internal HTTP (API key)
┌───────────▼─────────────────────────────────────────────────┐
│  FastAPI AI Service  (port 9000)                            │
│  RagService · QwenService (Ollama) · EmbeddingService       │
│  Qdrant vector store · PDF ingestion · aiMathSanitizer      │
└───────────┬──────────────┬──────────────────────────────────┘
            │              │
     ┌──────▼──────┐  ┌────▼───────────────────┐
     │  Ollama LLM │  │  Qdrant vector store   │
     │ qwen2.5:7b  │  │ class_qa_embeddings    │
     │ (port 11434)│  │ class_material_embed.  │
     └─────────────┘  └────────────────────────┘
```

Full architecture details: [`docs/rag/architecture.md`](docs/rag/architecture.md)

---

## Features

| Feature | Description |
| ------- | ----------- |
| **Class Q&A Stream** | Persistent threaded chat per class; AI auto-answers from indexed materials |
| **RAG answering** | Previous Q&A reuse → material chunk retrieval → escalate to doctor |
| **Study with AI** | Summary, Study Notes, Page Summaries, Quiz, Flashcards — all from PDFs |
| **AI output persistence** | Generated results saved to DB; reopen instantly without re-calling LLM |
| **Regenerate** | Force fresh LLM generation, bypassing all caches |
| **Notifications** | Class-scoped: AI answered, doctor replied, question pending |
| **Role-based access** | Student / Doctor / Admin with route protection |
| **Admin panel** | User approval, department/course/class management |
| **Grades & Attendance** | Per-student tracking with charts |

---

## Requirements

| Dependency | Version | Notes |
| ---------- | ------- | ----- |
| Node.js | **18+** | Backend + frontend build |
| Python | **3.10+** | AI service |
| Ollama | latest | Must be running locally |
| Tesseract OCR | 5+ | For scanned PDF support |
| RAM | **8 GB min, 16 GB recommended** | Qwen2.5 7B needs ~6 GB |

---

## Setup

### 1. Clone

```bash
git clone https://github.com/MohammadEmad2003/UniSystem.git
cd UniSystem
```

### 2. Ollama (LLM)

Install Ollama from [https://ollama.com](https://ollama.com), then:

```bash
ollama serve          # start the daemon (runs on port 11434)
ollama pull qwen2.5:7b-instruct   # ~4.7 GB download, one-time
```

> **Lighter alternative:** `ollama pull qwen2.5:1.5b-instruct` (~1 GB) — faster but lower quality.

### 3. Tesseract OCR (optional, for scanned PDFs)

- **Windows:** download installer from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
- **macOS:** `brew install tesseract`
- **Linux:** `sudo apt install tesseract-ocr`

Set `TESSERACT_CMD` in `ai-service/.env` if the path differs from the default.

### 4. Backend (Node.js / Express)

```bash
cd backend
npm install
cp .env.example .env          # then edit .env with your secrets
node index.js                 # starts on PORT=3000
```

The SQLite database is auto-created on first run — no migration step needed.

### 5. AI Service (FastAPI / Python)

```bash
cd ai-service
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # then edit .env
uvicorn main:app --host 0.0.0.0 --port 9000
# or simply:
python main.py
```

### 6. Frontend (React / Vite)

```bash
cd frontend
npm install
cp .env.example .env          # edit if backend/AI ports differ
npm run dev                   # dev server on port 5173
```

Open `http://localhost:5173`.

---

## Environment Variables

### `backend/.env`

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT` | `3000` | Express server port |
| `JWT_SECRET` | — | **Required.** Long random string |
| `INTERNAL_API_KEY` | — | Shared secret with AI service |
| `AI_SERVICE_URL` | `http://localhost:9000` | AI service base URL |
| `DATABASE_PATH` | `./database.db` | SQLite file location |
| `EMAIL_USER` | — | Optional SMTP for email verification |
| `EMAIL_PASS` | — | Optional SMTP app password |

### `ai-service/.env`

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT` | `9000` | FastAPI port |
| `BACKEND_API_URL` | `http://localhost:3000` | Node backend URL |
| `INTERNAL_API_KEY` | — | Must match backend |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama daemon URL |
| `OLLAMA_MODEL` | `qwen2.5:7b-instruct` | Model to use |
| `QDRANT_IN_MEMORY` | `false` | `true` = no persistence |
| `QDRANT_PATH` | `./qdrant_storage` | Persistent vector DB path |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformer model |
| `ENABLE_OCR` | `true` | Tesseract OCR for scanned PDFs |
| `QA_REUSE_THRESHOLD` | `0.78` | Cosine threshold for Q&A reuse |

### `frontend/.env`

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | Node backend base URL |
| `VITE_AI_BASE_URL` | `http://localhost:9000` | AI service base URL |
| `VITE_USE_MOCK` | `false` | `true` = use in-memory mock data |

---

## Indexing Materials

After uploading a PDF to a class, the AI service indexes it automatically when the first question is asked. To trigger indexing manually:

```
POST http://localhost:9000/rag/index
{ "class_id": 1 }
```

---

## Project Structure

```
UniSystem/
├── backend/                # Node.js / Express API
│   ├── controllers/        # Route handlers
│   ├── models/             # SQLite table definitions (auto-create)
│   ├── routes/             # Express routers
│   ├── middleware/         # JWT, roles, upload
│   ├── utilities/          # DB helpers, notification factory
│   └── services/           # AI service client, email
│
├── ai-service/             # Python FastAPI RAG service
│   ├── main.py             # Route declarations + Pydantic models
│   ├── rag_service.py      # Core RAG orchestration
│   ├── qwen_service.py     # Ollama HTTP client + prompt builders
│   ├── embedding_service.py
│   ├── vector_store.py     # Qdrant wrapper
│   ├── backend_client.py   # Internal Node API calls
│   └── requirements.txt
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/classes/  # ClassStreamTab, ClassMaterialsTab, etc.
│   │   ├── components/     # MarkdownContent (shared AI renderer)
│   │   ├── services/       # API clients (real + mock)
│   │   ├── utils/          # aiMathSanitizer, exportStudyContent
│   │   └── types/          # TypeScript interfaces
│   └── public/
│
├── docs/rag/               # Architecture documentation (Markdown + PDF)
├── pdf-file-server/        # Optional static file server for PDFs
└── docker-compose.yml      # Multi-container setup
```

---

## Docker (optional)

```bash
# Requires Ollama running on the host machine
docker-compose up --build
```

> The compose file starts `backend`, `ai-service`, and `frontend` (nginx).
> Ollama must be running separately on the host — it is not containerised.

---

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| `Connection refused :11434` | Run `ollama serve` and ensure the model is pulled |
| `Material not indexed` | The class has no indexed PDFs yet — upload a PDF and ask a question |
| `Tesseract not found` | Set `TESSERACT_CMD` in `ai-service/.env` to the correct path |
| `JWT malformed` | Frontend `.env` `VITE_API_BASE_URL` doesn't match backend port |
| `force_refresh` ignored | Restart the AI service — the in-memory cache is process-level |
| Study AI result not saving | Check `INTERNAL_API_KEY` matches in both backend and AI service `.env` |
| Qdrant vectors reset on restart | Set `QDRANT_IN_MEMORY=false` and provide `QDRANT_PATH` |

---

## Tech Stack

| Layer | Technologies |
| ----- | ------------ |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, React Router, Zustand, Axios, ReactMarkdown, KaTeX |
| Backend | Node.js 18, Express, SQLite (better-sqlite3), JWT, Nodemailer |
| AI service | Python 3.10+, FastAPI, Uvicorn, Ollama (Qwen2.5), Qdrant, sentence-transformers, PyMuPDF, Tesseract |
| LLM | Qwen2.5-7B-Instruct (via Ollama, local, no external API) |
| Vector DB | Qdrant (embedded, 384-dim MiniLM-L6-v2 cosine) |
