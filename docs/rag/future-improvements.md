# Future Improvements

The current RAG implementation prioritises correctness, observability and
self-hostability over latency and recall. This document collects the
proposed next steps, grouped by impact area, with notes on where each
would plug into the existing code.

---

## 1. Retrieval quality

### 1.1 Hybrid search (BM25 + dense)

* **Why:** dense retrieval misses exact-symbol matches like "FFT" or
  "$D_k$". BM25 over chunk text would catch them.
* **Where:** add a sparse index alongside the Qdrant collection, or use
  Qdrant's built-in sparse vectors. `RagService.ask_question` would
  combine the two with reciprocal rank fusion (RRF) before the chunk
  pruning step.
* **Effort:** medium (BM25 lib + payload indexer).

### 1.2 Cross-encoder reranking

* **Why:** the current top-k is purely vector-similar. A cross-encoder
  (e.g. `cross-encoder/ms-marco-MiniLM-L-6-v2`) would rerank the top-10
  using question+chunk pairs and substantially improve precision.
* **Where:** insert a rerank step after `search_materials` and before
  `_build_highlight`.
* **Effort:** low (existing `sentence-transformers` already provides
  cross-encoders).

### 1.3 Multi-query expansion

* **Why:** ambiguous questions ("define $D_k$") often have multiple
  equally-valid retrieval queries. The single rewritten query in
  `QwenService.rewrite_question` is a single lens.
* **Where:** generate 3 paraphrases, embed each, take the union of the
  top-k from each, then rerank.
* **Effort:** medium.

### 1.4 Per-class adaptive QA threshold

* **Why:** the global `QA_REUSE_THRESHOLD=0.78` is the right average
  but classes with tightly-worded short questions need a higher
  threshold to avoid false reuse.
* **Where:** store `qa_reuse_threshold` per class in SQLite, expose a
  doctor-only setting, fall back to env default.
* **Effort:** low.

---

## 2. Indexing scalability

### 2.1 Background job queue

* **Why:** indexing is currently synchronous on the AI-service request
  thread. A 30-page PDF blocks the FastAPI worker for tens of seconds.
* **Where:** introduce a Redis-backed queue (RQ or Celery). Endpoints
  return immediately with a job ID; clients poll `/rag/jobs/:id`.
* **Effort:** medium (touches deployment shape).

### 2.2 Material-upload trigger wired into the queue

* **Why:** `internalAiController.indexMaterialInAI` exists but isn't
  called from the upload flow. Lazy indexing via `withAutoIndex` works
  but adds latency to the *first* Study-with-AI call.
* **Where:** patch `MaterialController.js` (upload handler) to enqueue
  a job after a successful upload.
* **Effort:** low.

### 2.3 Incremental chunk updates

* **Why:** `bulk_replace_*` deletes everything for a class on every
  re-index. Replacing only the affected material would be far faster.
* **Where:** `VectorStore.replace_material_chunks` already does this
  for a single material; we just need the upload hook (above) to call
  it instead of a full re-index.
* **Effort:** low (most code already exists).

### 2.4 Embedding model upgrade path

* **Why:** MiniLM-L6-v2 is a 2021 baseline. Newer encoders (e5-base,
  bge-small-en) score noticeably better on retrieval benchmarks at the
  same dimensionality.
* **Where:** swap `EMBEDDING_MODEL`. Forces a full re-index.
* **Effort:** trivial config change.

---

## 3. UX — Class Stream

### 3.1 Streaming responses

* **Why:** the current request blocks for 4-15 s while Ollama generates.
  Token streaming would let the AI bubble fill in progressively.
* **Where:**
  * AI-service: change `_call_ollama` to use `stream=true` and yield
    chunks via FastAPI `StreamingResponse`.
  * Backend: open a Server-Sent Events relay endpoint, pass tokens
    through.
  * Frontend: switch `askAndSave` to an SSE consumer.
* **Effort:** large; touches all three services.

### 3.2 Feedback buttons (👍 / 👎)

* **Why:** to learn which answers students trust. Doctor analytics +
  future fine-tuning data.
* **Where:** add `Answer.Feedback` column, expose `POST /api/answers/:id/feedback`.
* **Effort:** small.

### 3.3 "Suppress AI answer when doctor replies" toggle

* **Why:** today both rows render in the stream. Some classes prefer
  to hide the AI answer once a doctor has authored one.
* **Where:** view-layer filter in `getClassQuestions`.
* **Effort:** trivial.

---

## 4. Study with AI

### 4.1 Cached sessions per material

* **Why:** today, `material_summary_cache` is keyed in-process and lost
  on restart. Quizzes/flashcards have no cache at all — every call
  costs an Ollama generation.
* **Where:** Redis (or a SQLite `AI_Cache` table) keyed by
  `(material_id, tool, options_hash)`. Invalidate on
  `replace_material_chunks`.
* **Effort:** medium.

### 4.2 PDF export of the live React DOM

* **Why:** the current PDF export builds a serialised HTML lookalike
  rather than capturing the live KaTeX-rendered DOM. Formulas appear
  as raw `$...$` source in the PDF.
* **Where:** rewrite `exportStudyContent.ts` to use `html2canvas` on
  the visible result container, or render via headless `puppeteer` on
  the backend.
* **Effort:** medium; deployed implementation already explored.

### 4.3 Spaced-repetition mode for flashcards

* **Why:** flashcards today are read-once. Adding SM-2 / FSRS scheduling
  turns them into a recurring study tool.
* **Where:** new `Flashcard_Review` table (`user_id`, `flashcard_id`,
  `due_at`, `interval`, `ease`); new `/api/flashcards/review` endpoints.
* **Effort:** medium.

---

## 5. Observability and analytics

### 5.1 Doctor analytics dashboard

* **Why:** a doctor would benefit from seeing which questions got AI
  answers, with what confidence, and which were escalated.
* **Where:** new aggregate view on `Answer` joined with `Questions`,
  filtered by `Class.Doctor_ID`. Time-series of `Confidence` and
  `Source_Type` distribution.
* **Effort:** medium (no schema change required).

### 5.2 LLM call accounting

* **Why:** today `[OLLAMA] ... done in Xs` is the only telemetry.
  Aggregate counters (per-class, per-tool tokens / latency / failures)
  would help capacity planning.
* **Where:** wrap `_call_ollama` with a Prometheus client; export
  `/metrics`.
* **Effort:** small.

### 5.3 Material coverage report

* **Why:** "which lectures haven't been indexed" is a doctor question
  today answered only by reading logs.
* **Where:** add `GET /rag/index/class/:id/status` returning per-material
  chunk counts; surface in the UI as a green/yellow/red dot per
  material.
* **Effort:** small.

---

## 6. Security hardening

### 6.1 Auth on `/rag/*`

* **Why:** the AI service has no auth on its public endpoints. Anyone
  who can route to port 9000 can fetch class material text via
  `/rag/material/summary`.
* **Where:** adopt the same `INTERNAL_API_KEY` check on `/rag/*` and
  pass the header from `aiServiceClient.js`.
* **Effort:** small. Strongly recommended for any non-localhost
  deployment.

### 6.2 Access enforcement on `askAndSave`

* **Why:** see *Current limitation* in `api-reference.md` — the canonical
  ask endpoint does not run `userHasClassAccess`.
* **Where:** call `userHasClassAccess` at the top of `askAndSave`,
  matching the pattern in `askClassQuestion`.
* **Effort:** trivial.

### 6.3 Schema migrations for AI columns

* **Why:** as called out in `database-and-vector-schema.md`, the AI
  columns on `Answer` are not declared anywhere in code.
* **Where:** add `ALTER TABLE` statements to `migrate.js` and run on
  every deploy. See the snippet in that document.
* **Effort:** trivial.

---

## 7. Multi-modal and multi-language

### 7.1 Image / diagram embedding

* **Why:** PDFs in engineering classes contain figures whose semantics
  the text encoder misses entirely.
* **Where:** add a CLIP-based image encoder; store image-vector points
  in a third Qdrant collection; cross-search at query time.
* **Effort:** large.

### 7.2 Arabic + English mixed content

* **Why:** UniSystem is built for Arabic-speaking universities; some
  questions and answers will be Arabic.
* **Where:** swap `EMBEDDING_MODEL` to a multilingual variant
  (`paraphrase-multilingual-MiniLM-L12-v2` or `bge-m3`); ensure the
  Qwen instruct model handles Arabic well (the 7B variant does).
* **Effort:** trivial config change + retest.

---

## 8. Priority recommendation

If you have a single sprint to spend on RAG, do these four things:

1. **Schema migrations for the AI columns** — eliminates a deployment
   gotcha (`database-and-vector-schema.md` §1.3 callout).
2. **Auth on `/rag/*`** — closes a real security hole.
3. **Cross-encoder reranking** — biggest answer-quality win for the
   smallest engineering cost.
4. **Material-upload triggers indexing on a background queue** — fixes
   the first-call latency that students notice every time.

Everything else is incremental and can wait until usage data shows it
matters.
