from __future__ import annotations

from typing import Any

from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException
from pydantic import BaseModel

from rag_service import RagService

load_dotenv()

app = FastAPI(title="UniSystem AI Service", version="1.0.0")
rag_service = RagService()


class AskRequest(BaseModel):
    class_id: int
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
