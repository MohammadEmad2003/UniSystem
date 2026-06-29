from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from local_llm import LocalLLM
from rag_service import RagService

load_dotenv()
print("MAIN LOADED:", __file__)


def _preload_local_llm() -> None:
    """Load the GGUF model into memory once at startup."""
    try:
        print("[LLM] Loading model...")
        LocalLLM.get()._load()
        print("[LLM] Model loaded successfully!")
    except Exception as exc:
        print(f"[LLM] WARNING — model failed to load: {exc}")
        print("[LLM] Service will start, but LLM inference will fail until the model is available.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _preload_local_llm()
    yield


app = FastAPI(title="UniSystem AI Service", version="1.0.0", lifespan=lifespan)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
backend_url = os.getenv("BACKEND_API_URL", "http://localhost:3000").rstrip("/")
pdf_base_url = os.getenv("PDF_BASE_URL", "http://localhost:3001").rstrip("/")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, backend_url, pdf_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = RagService()


class AskRequest(BaseModel):
    class_id: int
    user_id: int
    question: str


class GeneralChatRequest(BaseModel):
    user_id: int
    question: str


class MaterialSummaryRequest(BaseModel):
    class_id: int
    material_id: int
    # legacy param kept for backward compat
    mode: str = "simple"
    # new options
    length: str = "medium"           # short | medium | detailed
    format: str = "study_notes"      # paragraph | bullet_points | study_notes
    include_formulas: bool = True
    force_refresh: bool = False


class PageSummaryRequest(BaseModel):
    class_id: int
    material_id: int
    detail_level: str = "normal"     # brief | normal | detailed
    include_key_terms: bool = True
    include_formulas: bool = True
    force_refresh: bool = False


class NotesRequest(BaseModel):
    class_id: int
    material_id: int
    notes_style: str = "bullet_notes"   # cornell | bullet_notes | exam_revision
    detail_level: str = "detailed"      # normal | detailed | very_detailed
    include_examples: bool = True
    include_formulas: bool = True
    force_refresh: bool = False


class MaterialRequest(BaseModel):
    class_id: int
    material_id: int


class QuizRequest(BaseModel):
    class_id: int
    material_id: int
    num_questions: int = 10
    difficulty: str = "mixed"        # easy | medium | hard | mixed
    question_type: str = "mcq"       # mcq | true_false | mixed
    force_refresh: bool = False


class FlashcardsRequest(BaseModel):
    class_id: int
    material_id: int
    num_cards: int = 10
    focus: str = "mixed"             # key_terms | definitions | formulas | mixed
    include_examples: bool = False
    force_refresh: bool = False


@app.post("/ai/chat")
def general_chat(payload: GeneralChatRequest) -> dict[str, Any]:
    try:
        question = (payload.question or "").strip()
        if not question:
            raise HTTPException(status_code=400, detail="question is required")
        answer = rag_service.qwen_service.generate_general_answer(question)
        if not answer:
            return {"status": "answered", "answer": "I'm unable to generate a response right now. Please try again."}
        clean = rag_service.clean_ai_text(answer)
        return {"status": "answered", "answer": clean}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/ask")
def ask_question(payload: AskRequest) -> dict[str, Any]:
    print("🔥 ROUTE HIT")
    print(payload)

    try:
        result = rag_service.ask_question(
            class_id=payload.class_id,
            user_id=payload.user_id,
            question=payload.question,
        )

        print("🔥🔥 RAG RETURNED:", result)

        return result

    except Exception as exc:
        print("❌ ERROR:", exc)
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/rag/index/class/{class_id}")
def index_class(class_id: int) -> dict[str, Any]:
    try:
        return rag_service.index_class(class_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/rag/index/class/{class_id}/qa")
def clear_class_qa(class_id: int) -> dict[str, Any]:
    try:
        return rag_service.clear_class_qa(class_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/index/question/{question_id}")
def index_question(
    question_id: int, payload: dict[str, Any] | None = Body(default=None)
) -> dict[str, Any]:
    try:
        return rag_service.index_question(question_id, payload or {})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/index/material/{material_id}")
def index_material(
    material_id: int, payload: dict[str, Any] | None = Body(default=None)
) -> dict[str, Any]:
    try:
        return rag_service.index_material(material_id, payload or {})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/material/summary")
def summarize_material(payload: MaterialSummaryRequest) -> dict[str, Any]:
    try:
        return rag_service.summarize_material_content(
            class_id=payload.class_id,
            material_id=payload.material_id,
            mode=payload.mode,
            length=payload.length,
            format=payload.format,
            include_formulas=payload.include_formulas,
            force_refresh=payload.force_refresh,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/material/page-summaries")
def material_page_summaries(payload: PageSummaryRequest) -> dict[str, Any]:
    try:
        return rag_service.generate_page_summaries(
            class_id=payload.class_id,
            material_id=payload.material_id,
            detail_level=payload.detail_level,
            include_key_terms=payload.include_key_terms,
            include_formulas=payload.include_formulas,
            force_refresh=payload.force_refresh,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/material/notes")
def material_notes(payload: NotesRequest) -> dict[str, Any]:
    try:
        return rag_service.generate_material_notes(
            class_id=payload.class_id,
            material_id=payload.material_id,
            notes_style=payload.notes_style,
            detail_level=payload.detail_level,
            include_examples=payload.include_examples,
            include_formulas=payload.include_formulas,
            force_refresh=payload.force_refresh,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/material/quiz")
def material_quiz(payload: QuizRequest) -> dict[str, Any]:
    try:
        return rag_service.generate_material_quiz(
            class_id=payload.class_id,
            material_id=payload.material_id,
            num_questions=payload.num_questions,
            difficulty=payload.difficulty,
            question_type=payload.question_type,
            force_refresh=payload.force_refresh,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/material/flashcards")
def material_flashcards(payload: FlashcardsRequest) -> dict[str, Any]:
    try:
        return rag_service.generate_material_flashcards(
            class_id=payload.class_id,
            material_id=payload.material_id,
            num_cards=payload.num_cards,
            focus=payload.focus,
            include_examples=payload.include_examples,
            force_refresh=payload.force_refresh,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok"}


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.getenv("PORT", "9000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
