# UniSystem RAG — Documentation Package

This directory contains the complete end-to-end documentation for the
UniSystem Retrieval-Augmented Generation (RAG) subsystem.

UniSystem is a learning-management platform for university classes. The RAG
subsystem lets a student post a question to the **Class Stream** and receive
an AI answer that is grounded in:

1. previous Q&A pairs that were already answered by a doctor in the same
   class, OR
2. the actual class material (PDF chunks indexed into a vector store).

If neither source produces a confident answer, the question is escalated to
the class doctor. Doctors can also generate **Study with AI** artifacts
(summaries, page-by-page summaries, flashcards, quizzes, study notes) from
any material in their class.

---

## Documentation map

| File | What it covers |
| ---- | -------------- |
| [`architecture.md`](./architecture.md) | Every layer of the stack — frontend, Node backend, FastAPI AI service, SQLite, Qdrant, Ollama, embeddings — with a Mermaid system diagram. |
| [`end-to-end-flow.md`](./end-to-end-flow.md) | The full life-cycle of a class question, from typing in the Stream box to the answer being persisted, indexed and reused. Mermaid sequence diagrams included. |
| [`api-reference.md`](./api-reference.md) | Real HTTP endpoints (backend + AI service), request/response schemas, examples. |
| [`database-and-vector-schema.md`](./database-and-vector-schema.md) | SQLite tables (`Questions`, `Answer`) + AI metadata columns, plus Qdrant collections (`class_qa_embeddings`, `class_material_embeddings`) with payload fields. |
| [`debugging-guide.md`](./debugging-guide.md) | Real-world failure modes observed during development, with actionable diagnostics. |
| [`future-improvements.md`](./future-improvements.md) | Roadmap for hybrid search, reranking, background indexing, exports, analytics, streaming. |

A separate `tests` checklist (manual scenarios) is included at the bottom of
`debugging-guide.md`.

---

## Tech stack at a glance

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS, `react-markdown` + `remark-math` + `rehype-katex` |
| Backend  | Node.js + Express, `axios` for service-to-service, JWT auth, SQLite (`sqlite3` driver) |
| AI service | Python 3 + FastAPI + Uvicorn, `sentence-transformers` (MiniLM-L6-v2), `qdrant-client`, `pymupdf` + `pytesseract` for PDF/OCR |
| Vector store | Qdrant (in-memory or persistent local path) |
| LLM | Ollama running a Qwen2.5 instruct model (`qwen2.5:7b-instruct` or `:3b-instruct`) |
| Storage | SQLite database file (`backend/database.db`) and uploaded files in `backend/uploads/` |

---

## Quick mental model

```
Student question
      │
      ▼
React (ClassStreamTab)
      │  POST /api/classes/:classId/ai/ask-and-save
      ▼
Express  ──►  insert into Questions
   │   ──►  POST  http://ai-service:9000/rag/ask
   │                │
   │                ├─► rewrite query (Ollama)
   │                ├─► embed (MiniLM)
   │                ├─► search Qdrant: class_qa_embeddings
   │                ├─► search Qdrant: class_material_embeddings
   │                └─► generate answer (Ollama)
   │
   ◄──── { status, answer, source_type, confidence, ... }
   │
   ├─► insert into Answer with Is_AI_Generated = 1
   ├─► POST /rag/index/question/:id   (immediate)
   └─► debounced full-class re-index
```

See [`end-to-end-flow.md`](./end-to-end-flow.md) for the detailed diagram.

---

## How to read this package

* If you want to **understand the system** — start with `architecture.md`,
  then `end-to-end-flow.md`.
* If you are **integrating** with the AI service — read `api-reference.md`.
* If you are **debugging a failure** — go straight to `debugging-guide.md`.
* If you are **extending the system** — see `future-improvements.md`.

---

## Conventions used in these docs

* Mermaid diagrams render natively on GitHub.
* "Current limitation" callouts mark places where the code is intentionally
  simple or where a feature mentioned elsewhere does not exist yet.
* All paths are repository-relative.
* All env-var names match the actual code.
