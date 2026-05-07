# API Reference

Every endpoint that participates in the RAG flow is listed here. Endpoints
are grouped by service.

* **Backend (Node/Express)** — base URL `http://localhost:3000/api`
  (configurable via `VITE_API_BASE_URL` on the frontend).
* **AI service (FastAPI)** — base URL `http://localhost:9000`
  (configurable via `VITE_AI_BASE_URL` on the frontend, `AI_SERVICE_URL`
  on the backend).

All backend endpoints require a JWT in `Authorization: Bearer <token>`
**unless** the route is mounted under `/api/internal/ai/*`, in which case
authentication is via `x-internal-api-key`. AI-service endpoints have no
authentication and rely on network isolation.

---

## 1. Backend — Class-stream RAG

### 1.1 `POST /api/classes/:classId/ai/ask-and-save`

The primary endpoint used by the **Class Stream** UI. It persists the
question, calls the AI service, persists the AI answer if any, schedules
re-indexing, and returns the new question object — all in one call.

| Field | Value |
| ----- | ----- |
| Auth  | JWT, role `Student` or `Doctor`, must be enrolled in the class (or be its `Doctor_ID`) |
| Route | `POST /api/classes/:classId/ai/ask-and-save` |
| Controller | `askAndSave` in `discussionController.js` |
| Body | `{ "text": "..." }` |

**Success — 201 (AI answered):**
```json
{
  "success": true,
  "data": {
    "status": "answered",
    "question": {
      "Questions_ID": 412,
      "Class_ID": 7,
      "Text": "What is the Fourier series formula?",
      "User_ID": 23,
      "User_Name": "Mona Adel",
      "User_Role": "student",
      "Time": "2026-05-07T13:14:55.123Z",
      "answers": [{
        "Answer_ID": 1,
        "Questions_ID": 412,
        "Text": "The Fourier series of a periodic signal ...",
        "Time": "2026-05-07T13:14:56.001Z",
        "User_ID": null,
        "User_Name": "AI Assistant",
        "User_Role": "ai",
        "Is_AI_Generated": 1,
        "Source_Type": "material",
        "Source_ID": "88",
        "Confidence": 0.7842,
        "AI_Metadata": "{\"source_type\":\"material\",\"page\":12,...}"
      }]
    }
  }
}
```

**Success — 201 (escalated):**
```json
{
  "success": true,
  "data": {
    "status": "sent_to_doctor",
    "question": { "Questions_ID": 413, "answers": [], "...": "..." }
  }
}
```

A doctor notification is created in the same request.

**Errors:**
* 400 — missing or empty `text`.
* 401 — missing/invalid JWT.
* 403 — user not enrolled / not the class doctor (enforced by
  `allowedTo(STUDENT, DOCTOR)`; the access check is only enforced by
  `aiController.askClassQuestion`, not by `askAndSave` — see the
  *Current limitation* note below).

> **Current limitation:** `askAndSave` does not run the
> `userHasClassAccess` check that `askClassQuestion` runs. A logged-in
> student can in principle call `askAndSave` for a class they are not
> enrolled in. Add the same check to `askAndSave` for production use.

---

### 1.2 `POST /api/classes/:classId/ai/ask`

Class-scoped AI ask **without** persistence to the discussion stream.
Used by `realClassService.askAI` (kept for legacy / programmatic
callers).

| Auth | JWT, `Student` or `Doctor`, with class access (verified by `userHasClassAccess`). |
| Body | `{ "question": "..." }` |

* If the AI answers → returns the AI service response verbatim (200).
* If `sent_to_doctor` → inserts an escalated `Questions` row, sends a
  doctor notification, returns 201 with `{ status: "sent_to_doctor",
  question_id, message }`.

---

### 1.3 `POST /api/classes/ai/ask`

General (non-class) chat with the LLM. Routes to AI `POST /ai/chat`.

| Auth | JWT (any role) |
| Body | `{ "question": "..." }` |
| Response | `{ status: "answered", answer: "..." }` |

---

### 1.4 `POST /api/questions/:questionId/answers`

Posts a human answer to an existing question. When a doctor uses this
endpoint, the controller fires
`aiServiceClient.indexQuestion(questionId)` and a debounced full-class
re-index.

| Auth | JWT, `Student` or `Doctor` |
| Body | `{ "text": "..." }` |
| Response | `201 { success, message }` |

---

### 1.5 `GET /api/classes/:classId/questions`

Lists every question in the class with all its answers, including the
AI-specific columns. Used by `ClassStreamTab` on mount so the stream
re-renders with the saved AI answers after a page refresh.

---

## 2. Backend — Internal AI bridge

These endpoints are reserved for the AI service. They are mounted at
`/api/internal/ai/*` and protected by `verifyInternalApiKey` (header
`x-internal-api-key`, validated with `crypto.timingSafeEqual`).

| Route | Method | Purpose |
| ----- | ------ | ------- |
| `/classes/:classId/questions`  | GET  | All questions for a class with their answers (used during indexing). |
| `/classes/:classId/materials`  | GET  | All materials for a class joined to their lecture for `class_id`. |
| `/questions/:questionId`       | GET  | Single question + answers. 404 if not found. |
| `/materials/:materialId`       | GET  | Single material row. 404 if not found. |
| `/materials/:materialId/index/:classId` | POST | Backend-side helper that proxies to the AI service `POST /rag/index/material/:material_id`. **Current limitation:** this is exposed but never called from the UI; reserved for a future material-upload hook. |

Response envelope: `{ success: true, data: <row | array> }`. Errors use
the standard 4xx/5xx with `{ success: false, message }`.

Material payload shape returned to the AI service (mapped by
`mapMaterialRow`):
```jsonc
{
  "material_id": 88,
  "class_id": 7,
  "lecture_id": 31,
  "name": "Lecture 4 — Fourier Series",
  "url": null,
  "document": "uploads/lec4-fourier.pdf",
  "absolute_document_path": "C:/.../backend/uploads/lec4-fourier.pdf",
  "summarize": null,
  "type": "file"   // "file" | "link" | null
}
```

Question payload shape:
```jsonc
{
  "question_id": 412,
  "class_id": 7,
  "question_text": "What is ...",
  "user_id": 23,
  "doctor_id": null,
  "asked_by_name": "Mona Adel",
  "asked_by_role": "student",
  "answers": [
    {
      "answer_id": 1,
      "question_id": 412,
      "answer_text": "The Fourier series ...",
      "answer_time": "2026-05-07T13:14:56.001Z",
      "doctor_id": 9,
      "user_id": null,
      "answered_by_name": "Dr. Said",
      "answered_by_role": "doctor"
    }
  ]
}
```

---

## 3. AI service — RAG

### 3.1 `POST /rag/ask`

Body schema (`AskRequest`):
```jsonc
{
  "class_id": 7,
  "user_id": 23,
  "question": "What is the Fourier series?"
}
```

Returns one of three shapes (no envelope, the body **is** the result):

**Previous Q&A:**
```jsonc
{
  "status": "answered",
  "answer": "The Fourier series ...",
  "source": "previous_question",
  "source_type": "previous_qa",
  "source_id": "412",
  "confidence": 0.8412,
  "previous_question": {
    "question_id": "412",
    "text": "What is the Fourier series formula?",
    "asked_by": { "id": "23", "name": "Mona Adel", "role": "student" },
    "asked_at": "2026-04-22T09:11:00Z"
  },
  "previous_answer": {
    "answer_id": "1",
    "text": "The Fourier series ...",
    "answered_by": { "id": "9", "name": "Dr. Said", "role": "doctor" },
    "answered_at": "2026-04-22T10:02:33Z"
  }
}
```

**From material:**
```jsonc
{
  "status": "answered",
  "answer": "## Fourier Series\n\nA periodic signal $x(t)$ ...",
  "source_type": "material",
  "source_id": "88",
  "page": 12,
  "highlight": "...the Fourier series of a periodic signal...",
  "confidence": 0.7421
}
```

**Escalation:**
```jsonc
{ "status": "sent_to_doctor" }
```

Errors: 400 if `question` is empty, 500 on any other failure.

---

### 3.2 `POST /ai/chat`

General (non-RAG) chat.

```jsonc
// Request
{ "user_id": 23, "question": "Give me a study tip for finals" }

// Response
{ "status": "answered", "answer": "Mix recall and spaced practice ..." }
```

---

### 3.3 `POST /rag/index/class/{class_id}`

Full re-index for a class. Triggered from the **Re-index AI Data**
button in `ClassWorkspacePage`.

```jsonc
// Response
{
  "success": true,
  "class_id": 7,
  "questions_indexed": 14,
  "material_chunks_indexed": 312
}
```

### 3.4 `POST /rag/index/question/{question_id}`

Re-index a single question. Body is optional and ignored. Returns
`{ success, indexed: true|false, question_id, reason? }`.

### 3.5 `POST /rag/index/material/{material_id}`

Re-index a single material. Body is optional. Returns
`{ success, indexed, material_id, chunks_indexed | reason }`.

---

## 4. AI service — Study with AI

All five endpoints share two response shapes:

```jsonc
// Success
{ "status": "success", "material_id": 88, "<payload-key>": ... }

// Error
{ "status": "error", "message": "Material not indexed" | "Failed to parse LLM JSON output", "raw_output"?: "..." }
```

The frontend's `withAutoIndex` helper auto-recovers from the `Material
not indexed` error by calling `POST /rag/index/material/:id` and
retrying.

### 4.1 `POST /rag/material/summary`

```jsonc
// Request
{
  "class_id": 7,
  "material_id": 88,
  "length": "medium",            // short | medium | detailed
  "format": "study_notes",       // paragraph | bullet_points | study_notes
  "include_formulas": true,
  "mode": "simple"               // legacy; ignored unless "simple", in which case payload-cached summary may be reused
}

// Success
{
  "status": "success",
  "material_id": 88,
  "mode": "simple",
  "summary": "## Periodic Signals\n- A signal $x(t)$ ...\n..."
}
```

### 4.2 `POST /rag/material/page-summaries`

```jsonc
// Request
{
  "class_id": 7,
  "material_id": 88,
  "detail_level": "normal",   // brief | normal | detailed
  "include_key_terms": true,
  "include_formulas": true
}

// Success
{
  "status": "success",
  "material_id": 88,
  "page_summaries": [
    { "page": 1, "summary": "- The course introduces ..." },
    { "page": 2, "summary": "- A periodic signal ..." }
  ]
}
```

### 4.3 `POST /rag/material/notes`

```jsonc
// Request
{
  "class_id": 7,
  "material_id": 88,
  "notes_style": "bullet_notes",   // cornell | bullet_notes | exam_revision
  "detail_level": "detailed",      // normal | detailed | very_detailed
  "include_examples": true,
  "include_formulas": true
}

// Success
{ "status": "success", "material_id": 88, "notes": "## Topic 1 ..." }
```

### 4.4 `POST /rag/material/quiz`

```jsonc
// Request
{
  "class_id": 7,
  "material_id": 88,
  "num_questions": 10,
  "difficulty": "mixed",         // easy | medium | hard | mixed
  "question_type": "mcq"         // mcq | true_false | mixed
}

// Success
{
  "status": "success",
  "material_id": 88,
  "quiz": [
    {
      "type": "mcq",
      "difficulty": "medium",
      "question": "What is $\\omega_0$ for a signal of period $T_0$?",
      "options": [
        "A. $\\omega_0 = T_0$",
        "B. $\\omega_0 = 2\\pi/T_0$",
        "C. $\\omega_0 = 1/T_0$",
        "D. $\\omega_0 = \\pi T_0$"
      ],
      "answer": "B",
      "explanation": "$\\omega_0 = 2\\pi/T_0$ by definition of the fundamental frequency."
    }
  ]
}
```

`num_questions` is clamped to `[1, 20]`. Mixed quizzes must have ≥ 40 %
of each type when total ≥ 5; one retry is attempted on validation
failure.

### 4.5 `POST /rag/material/flashcards`

```jsonc
// Request
{
  "class_id": 7,
  "material_id": 88,
  "num_cards": 10,
  "focus": "mixed",          // key_terms | definitions | formulas | mixed
  "include_examples": false
}

// Success
{
  "status": "success",
  "material_id": 88,
  "flashcards": [
    {
      "focus_type": "formulas",
      "front": "Fourier series formula",
      "back": "$$x(t) = \\sum_{k=-\\infty}^{\\infty} D_k e^{j k \\omega_0 t}$$",
      "example": null
    }
  ]
}
```

`num_cards` clamped to `[1, 30]`. When `focus="formulas"`, the validator
requires every card's `back` to contain a `$` delimiter.

---

### 4.6 `GET /health`

Returns `{ "status": "ok" }`. Used by Docker / monitoring.

---

## 5. Quick frontend → endpoint cheat sheet

| User action | Frontend service call | HTTP target |
| ----------- | --------------------- | ----------- |
| Post in Class Stream | `realClassService.askAndSave` | `POST /api/classes/:id/ai/ask-and-save` |
| Doctor reply         | `discussionService.postAnswer` | `POST /api/questions/:id/answers` |
| Re-index AI data button | direct `fetch()` | `POST /rag/index/class/:id` (AI service) |
| Study → Summary      | `aiRagService.summarizeMaterial` | `POST /rag/material/summary` |
| Study → Page-by-page | `aiRagService.getPageSummaries`  | `POST /rag/material/page-summaries` |
| Study → Notes        | `aiRagService.getNotes`          | `POST /rag/material/notes` |
| Study → Quiz         | `aiRagService.getQuiz`           | `POST /rag/material/quiz` |
| Study → Flashcards   | `aiRagService.getFlashcards`     | `POST /rag/material/flashcards` |

For the database & vector schemas referenced by the responses above, see
[`database-and-vector-schema.md`](./database-and-vector-schema.md).
