# Debugging Guide

This document is a field manual for the failure modes that have actually
been observed during UniSystem development. Each entry lists the
symptom, where to look, and the fix. The last section is a manual
testing checklist you can run before a release.

---

## 1. Diagnostic principles

* Each component logs its own tag prefix. Search the AI-service stdout
  for one of:
  * `[ASK]`     — the ask flow (`RagService.ask_question`).
  * `[INDEX]`   — class / question / material indexing.
  * `[PDF]`     — PyMuPDF / OCR.
  * `[RAG]`     — chunk pruning + page selection.
  * `[OLLAMA]`  — every LLM call (operation name, latency, errors).
  * `[LLM_JSON]`— the 7-stage JSON parse pipeline.
  * `[QUIZ]` / `[FLASHCARDS]` / `[NOTES]` / `[SUMMARY]` / `[PAGE_SUMMARIES]` — Study-with-AI tools.
  * `[STUDY_AI_OPTIONS]` — full option dump on entry.
  * `[STUDY_AI_VALIDATION]` / `[STUDY_AI_RETRY]` — validator outcomes.
  * `[FLASHCARD_LATEX]` — per-formula validator output.
  * `[CONFIG]` — startup configuration dump.
* The Node backend logs every AI service round-trip via `[AI]` and `[RAG]`.
* The browser console mirrors selected events under `[STUDY_AI_OPTIONS]`
  and `[PDF_EXPORT]` for client-side debugging.

A single `Ctrl-C` of the AI-service prints the active QA threshold from
`[CONFIG] QA_REUSE_THRESHOLD=...` — useful when you suspect retrieval
is silently rejecting matches.

---

## 2. Common failures

### 2.1 "Ollama model not found" / no answer ever

**Symptoms:**
* AI-service logs: `[OLLAMA] answer generation — HTTP 404: ...model not found`.
* Frontend: question is always escalated to the doctor.

**Cause:** `OLLAMA_MODEL` does not match a model installed in Ollama.

**Fix:**
```bash
ollama list                  # see what's installed
ollama pull qwen2.5:7b-instruct
# OR set OLLAMA_MODEL to one of the listed names and restart the AI service
```

### 2.2 `[OLLAMA] ... cannot connect to http://localhost:11434`

**Cause:** Ollama daemon not running, or AI service is in Docker and
`OLLAMA_URL` still points to localhost.

**Fix (host):** `ollama serve`.
**Fix (Docker):** set `OLLAMA_URL=http://host.docker.internal:11434`
(or move Ollama into Compose and rename the host).

### 2.3 `raw_output empty` returned to the frontend

**Symptoms:** Study-with-AI tool returns
```json
{ "status": "error", "message": "Failed to parse LLM JSON output", "raw_output": "" }
```

**Cause:** the LLM call timed out or returned `None` (usually because
Ollama is overloaded or the prompt exceeded `n_ctx`).

**Where to look:** `[OLLAMA] quiz generation — timed out after Ns`.

**Fix:**
* Increase `num_predict` only if the response is being truncated (you
  will see a closing `]` missing in `[LLM_JSON] Pre-processed preview`).
* For 7B models on weak hardware, switch to `qwen2.5:3b-instruct` via
  `OLLAMA_MODEL`.
* Reduce `MATERIAL_CONTEXT_LIMIT` or `chunk_size` if total input is too
  large.

### 2.4 `Failed to parse LLM JSON output`

**Symptoms:** quiz / flashcards return error, `raw_output` looks JSON-ish.

**Where to look:** AI-service log for `[LLM_JSON] Stage N (label) failed: ...`.

The 7-stage repair pipeline (in
[`rag_service.py`](../../ai-service/rag_service.py)) is:

| Stage | What it does | Typical cure |
| ----- | ------------ | ------------ |
| 1 | Strip fences, control chars, smart quotes, trailing commas | bare ```` ```json ```` blocks |
| 2 | Extract largest depth-balanced `[...]` or `{...}` | trailing commentary |
| 3 | `json.loads` direct | already-clean output |
| 4 | LaTeX-escape repair (`\frac` etc.) | unescaped backslashes inside strings |
| 5 | Auto-close truncated arrays | LLM ran out of `num_predict` |
| 6 | Regex fallback (longest `[...]`) | unmatched brackets in prose |
| 7 | `ast.literal_eval` last resort | Python-style `True/False/None` literals |

If all seven fail, you'll see `All JSON parse stages failed for LLM
output`. **Increase `num_predict`** for the failing tool or **reduce
`num_questions` / `num_cards`**.

### 2.5 `QA results = 0` even though the class has answered questions

**Symptoms:**
* `[ASK] QA results: 0`
* Question is always sent to the doctor or always answered from
  material when you expected reuse.

**Probable causes:**

| Cause | Diagnosis |
| ----- | --------- |
| Class never indexed | `[INDEX] QA records inserted into Qdrant: 0`. Click **Re-index AI Data**. |
| Questions exist but have no answers yet | `[INDEX] Answered questions (have ≥1 answer): 0`. The Q&A index only stores answered questions. |
| Schema mismatch on the backend internal route | `[INDEX] WARNING: answered questions exist but none were indexed — check field names`. The backend response must use `question_text` and `answer_text`. |
| Wrong `class_id` type | `[ASK] class_id filter: '7' (type=str)`. **Qdrant filters distinguish int from str.** Make sure both `index_class` and `ask_question` cast to `int`. |

### 2.6 `score below threshold` — match found but rejected

**Symptoms:**
* `[ASK] QA match found but skipped (score=0.7411 < threshold=0.78)`.

**Action:**
* Increase the corpus first — better recall comes from more answered
  questions.
* If you really want broader reuse, lower `QA_REUSE_THRESHOLD` in
  `ai-service/.env` (e.g. `0.72`). Anything below `0.65` starts
  reusing wrong answers.

### 2.7 Wrong `class_id` type (subtle but devastating)

**Symptoms:**
* All material searches return `Material results: 0` even after a
  successful re-index.
* `[INDEX] class_id filter will use int: 7` but `[ASK] class_id filter:
  '7' (type=str)`.

**Cause:** the frontend or backend passed `class_id` as a string to
`/rag/ask`. Qdrant's `MatchValue(value=...)` is *type-strict*.

**Fix:** in any caller that hits `/rag/ask`, wrap with `Number(classId)`
(frontend) or `Number(classId)` (backend) before sending. The
controller `askAndSave` and `askClassQuestion` already do this; check
custom callers.

### 2.8 Malformed LaTeX renders as red KaTeX errors

**Symptoms:** answers contain red bordered text in the AI bubble.

**Where to look:** `[FLASHCARD_LATEX] card=... issues=[...]` in the
AI-service log; in the browser, the same text appears inside `<code>`
spans.

**How `aiMathSanitizer.ts` handles it:** unbalanced braces or empty
`\frac{}{}` formulas are downgraded to `<code>` so they render as plain
text rather than throwing. KaTeX is configured with
`throwOnError: false` so the rest of the message still renders.

**To force the LLM to produce better LaTeX,** every prompt already
includes `MATH_RULES` (in `qwen_service.py`). If the model still emits
`\begin{equation}` consistently, switch to a larger model
(`qwen2.5:7b-instruct`) — small models occasionally ignore the rules.

### 2.9 Markdown not rendering (text appears as one paragraph)

**Symptoms:** the answer body shows raw `## ` headings or `- ` bullets.

**Cause:** something is escaping newlines before the React render. The
backend SQLite stores `Answer.Text` verbatim, so check the
`mapRawAnswer` chain on the frontend.

**Verify:** open dev tools, inspect the `<MarkdownContent>` source
prop. If it contains literal `\n` substrings, the AI service double-
escaped — `clean_ai_text` should normalise these but a regression here
manifests as raw text.

### 2.10 Persistent Qdrant returns stale points after schema change

**Symptoms:** new payload fields are missing after deploy.

**Cause:** `QDRANT_IN_MEMORY=false` and `QDRANT_PATH` still holds the
old payloads.

**Fix:** stop the service, delete `qdrant_storage/`, restart, then
re-index every class. Or simply call `/rag/index/class/:id` for each
class — `bulk_replace_*` deletes by `class_id` first, so the new
payload schema replaces the old one.

### 2.11 PDF text extraction returns 0 chars

**Symptoms:** `[PDF] Page N source: none length: 0` for every page.

**Cause:** Either the PDF is image-only and OCR is disabled, or
Tesseract is not installed at the path in `TESSERACT_CMD`.

**Fix:**
* Set `ENABLE_OCR=true`.
* Verify `TESSERACT_CMD` points to a real `tesseract.exe` (Windows) or
  `/usr/bin/tesseract` (Linux).
* If OCR is enabled and still produces nothing, the page DPI may be too
  low — bump `dpi=200` in `extract_pdf_text_with_pages` (currently
  hardcoded).

### 2.12 Duplicate / outdated AI answers in the stream

**Symptoms:** an AI answer says something different from what the doctor
later wrote.

**Why this is fine:** AI answers are stored as separate `Answer` rows
with `Is_AI_Generated=1`. The doctor's answer is a normal row with the
same `Questions_ID` but a different `Answer_ID`. Both render in the
stream; the doctor's takes visual precedence (different colour, name).

**If you want to suppress AI answers after a doctor replies,** add a
filter in `getClassQuestions` that hides AI rows when a non-AI row
exists for the same `Questions_ID`. **Current limitation:** not
implemented.

---

## 3. Environment variables

Authoritative list (read directly from the code).

### 3.1 AI service (`ai-service/.env`)

| Var | Default | Where read | Purpose |
| --- | ------- | ---------- | ------- |
| `PORT` | `9000` | `main.py` | FastAPI port. |
| `BACKEND_API_URL` | `http://localhost:3000` | `backend_client.py`, `rag_service.py` | Used to fetch class questions/materials and to rebase relative `/api/...` references. |
| `INTERNAL_API_KEY` | _none_ (required) | `backend_client.py` | Sent as `x-internal-api-key`. |
| `QDRANT_IN_MEMORY` | `true` | `vector_store.py` | If `false`, Qdrant persists at `QDRANT_PATH`. |
| `QDRANT_PATH` | `./qdrant_storage` | `vector_store.py` | Persistent storage directory. |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | `embedding_service.py` | 384-dim cosine encoder. |
| `OLLAMA_URL` | `http://localhost:11434` | `qwen_service.py`, `main.py` | Ollama HTTP endpoint. |
| `OLLAMA_MODEL` | falls back to `QWEN_MODEL`, then `qwen2.5:7b-instruct` | `qwen_service.py` | LLM model name. |
| `QWEN_MODEL` | _(unset)_ | `qwen_service.py` | Legacy alias for `OLLAMA_MODEL`. |
| `QA_REUSE_THRESHOLD` | `0.78` | `rag_service.py` | Min cosine to reuse a previous Q&A. |
| `ENABLE_OCR` | `true` | `rag_service.py` | Enable Tesseract fallback for image-only PDFs. |
| `TESSERACT_CMD` | `C:\Program Files\Tesseract-OCR\tesseract.exe` | `rag_service.py` | Path to the Tesseract binary. |
| `ENABLE_MATERIAL_SUMMARY` | `false` | `rag_service.py` | When `true`, populate `chunk.summary` and `chunk.material_summary` via Ollama at index time. |
| `PDF_CHUNK_SIZE` | `900` | `rag_service.py` | Chunk window size in characters. |
| `PDF_CHUNK_OVERLAP` | `150` | `rag_service.py` | Overlap window in characters. |
| `PDF_BASE_URL` | `http://localhost:3001` | `rag_service.py` | Used to rebase `/files/...` references for the optional `pdf-file-server`. |
| `LOCAL_MODEL_*` | various | `local_llm.py` | Used only by the alternate `LocalLLM` runtime; **not** active in the default code path. |

### 3.2 Backend (`backend/.env`)

| Var | Default | Purpose |
| --- | ------- | ------- |
| `PORT` | `3000` | Express port. |
| `JWT_SECRET_KEY` | _(none)_ | JWT signing. |
| `INTERNAL_API_KEY` | _(none)_ | Validated by `verifyInternalApiKey`. **Must equal the AI service's value.** |
| `AI_SERVICE_URL` | `http://localhost:9000` | Read by `aiServiceClient.js` and `internalAiController.js`. |
| `AI_SERVICE_TIMEOUT_MS` | `60000` | Axios timeout for the AI service. |
| `EMAIL_*`, `BASE_URL`, etc. | various | Out of scope for RAG. |

### 3.3 Frontend (Vite)

| Var | Default | Purpose |
| --- | ------- | ------- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | Backend axios base. |
| `VITE_AI_BASE_URL`  | `http://localhost:9000`     | AI service axios base. |
| `VITE_USE_MOCK`     | `false` (in `docker-compose.yml`) | Switches `services/index.ts` to mock services for offline dev. |

---

## 4. Manual testing checklist

Run these end-to-end before tagging a release.

### 4.1 Class Stream — RAG

- [ ] **Previous Q&A reuse.** As a doctor, post a question and answer it.
  As a student in another browser, ask the same question (slight
  paraphrase). Expect: lavender bubble with "Previous Q&A" badge, asker
  + answerer names visible, `% match` ≥ 78%.
- [ ] **Material answering.** Upload a PDF, click **Re-index AI Data**,
  then ask a question whose answer is in the PDF. Expect: bubble shows
  "From material" + page citation, confidence ≥ 60%.
- [ ] **Unknown question.** Ask a question with no relevant material.
  Expect: question shows up in stream, no AI bubble, doctor receives a
  `new_question` notification.
- [ ] **Refresh persistence.** After any of the above, hard-refresh the
  browser. Expect: AI answers appear identically (rendered from
  `AI_Metadata` parsed by `mapRawAnswer`).

### 4.2 Indexing

- [ ] **Re-index AI Data button.** As doctor/admin, click the button.
  Expect: spinner + green toast `AI data re-indexed successfully`.
- [ ] **Doctor reply triggers re-index.** Reply to an unanswered
  question; check AI-service logs for `[RAG] Auto re-index OK class=...
  source=doctor_answer`. Then re-ask a paraphrase from the student
  account → expect Previous Q&A reuse.
- [ ] **Lazy material indexing.** Upload a PDF and immediately open
  Study with AI → Quiz. Expect: brief delay (the `withAutoIndex`
  fallback runs), then a quiz appears.

### 4.3 Study with AI

- [ ] **Quiz — True/False.** Generate 5 T/F questions on a known PDF.
  Expect: every item has 2 options A/B, `type: "true_false"`, mix of
  True/False answers.
- [ ] **Quiz — Mixed.** Generate 10 mixed. Expect: ≥4 MCQ and ≥4 T/F
  (the `_validate_quiz` rule).
- [ ] **Flashcards — Formulas.** Generate 5 with `focus="formulas"`.
  Expect: every back contains `$...$` or `$$...$$`.
- [ ] **Summary — Length switching.** Run summary with `length=short`,
  then `length=detailed` on the same material. Expect: clearly
  different sizes (cache key includes length, so both run cleanly).
- [ ] **Page summaries.** Run on a multi-page PDF. Expect: an entry per
  page in order.

### 4.4 Markdown / KaTeX

- [ ] **Inline math.** Ask "What is the formula for $\omega_0$?". Expect:
  the answer renders LaTeX symbols, not `$...$` literals.
- [ ] **Display math.** Generate notes with `include_formulas=true`.
  Expect: at least one `$$ ... $$` rendered as block math.
- [ ] **Malformed math fallback.** If a quiz item happens to contain
  `\frac{}{}`, expect it to render as `<code>` rather than a red KaTeX
  box.

### 4.5 Auth and access

- [ ] Student not enrolled in class hits `/api/classes/:id/ai/ask` →
  expect 403 from `userHasClassAccess`.
- [ ] AI service called without `x-internal-api-key` on
  `/api/internal/ai/...` → expect 401.
- [ ] Backend down → frontend Class Stream still loads (ask returns
  status `'fallback'`); the bubble simply does not appear.

---

## 5. When in doubt, dump configuration

A 30-second sanity check:

```bash
# In the AI service log, look for these lines on startup
[CONFIG] QA_REUSE_THRESHOLD=0.78
[Qdrant] mode: persistent at ./qdrant_storage
[qwen_service] Using Ollama LLM
[qwen_service] Model : qwen2.5:7b-instruct
[qwen_service] URL   : http://localhost:11434
[startup] Ollama reachable at http://localhost:11434. Available models: ['qwen2.5:7b-instruct']
```

If any of these are missing or wrong, fix the corresponding env var
before going further. Most "the AI never answers" tickets resolve at
this step.

For roadmap items, see [`future-improvements.md`](./future-improvements.md).
