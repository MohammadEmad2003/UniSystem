from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from rag_service import RagService

load_dotenv()


def _preload_model() -> None:
    """Download + load the LLM into memory at startup.
    If the model is already in the HuggingFace cache it won't be re-downloaded.
    """
    use_local = os.getenv("USE_LOCAL_MODEL", "true").lower() == "true"
    if not use_local:
        print("[startup] USE_LOCAL_MODEL=false — skipping local model preload")
        return
    try:
        from local_llm_transformers import TransformersLLM
        print("[startup] Preloading Qwen model (downloading if not cached)...")
        TransformersLLM.get()._load()
        print("[startup] Model ready.")
    except Exception as exc:
        print(f"[startup] Model preload failed: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _preload_model()
    yield


app = FastAPI(title="UniSystem AI Service", version="1.0.0", lifespan=lifespan)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],
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
    mode: str = "simple"


class MaterialRequest(BaseModel):
    class_id: int
    material_id: int


class QuizRequest(BaseModel):
    class_id: int
    material_id: int
    num_questions: int = 5


class FlashcardsRequest(BaseModel):
    class_id: int
    material_id: int
    num_cards: int = 10


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
    try:
        return rag_service.ask_question(
            class_id=payload.class_id,
            user_id=payload.user_id,
            question=payload.question,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/index/class/{class_id}")
def index_class(class_id: int) -> dict[str, Any]:
    try:
        return rag_service.index_class(class_id)
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
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/material/page-summaries")
def material_page_summaries(payload: MaterialRequest) -> dict[str, Any]:
    try:
        return rag_service.generate_page_summaries(
            class_id=payload.class_id,
            material_id=payload.material_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/rag/material/notes")
def material_notes(payload: MaterialRequest) -> dict[str, Any]:
    try:
        return rag_service.generate_material_notes(
            class_id=payload.class_id,
            material_id=payload.material_id,
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
