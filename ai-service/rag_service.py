from __future__ import annotations

import ast
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import fitz
import pytesseract
import requests
from dotenv import load_dotenv
from PIL import Image
from qdrant_client.http import models

from backend_client import BackendClient
from embedding_service import EmbeddingService
from qwen_service import QwenService
from vector_store import VectorStore

load_dotenv()


class RagService:
    QA_MATCH_THRESHOLD = 0.82
    MATERIAL_MATCH_THRESHOLD = 0.50
    ANSWER_CONFIDENCE_THRESHOLD = 0.6
    MATERIAL_CONTEXT_LIMIT = 5

    def __init__(self) -> None:
        self.backend_client = BackendClient()
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore(self.embedding_service.vector_size)
        self.qwen_service = QwenService()

        self.enable_material_summary = (
            os.getenv("ENABLE_MATERIAL_SUMMARY", "false").lower() == "true"
        )
        self.enable_ocr = os.getenv("ENABLE_OCR", "true").lower() == "true"
        self.tesseract_cmd = os.getenv(
            "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        )
        self.pdf_chunk_size = int(os.getenv("PDF_CHUNK_SIZE", "900"))
        self.pdf_chunk_overlap = int(os.getenv("PDF_CHUNK_OVERLAP", "150"))
        self.backend_api_url = os.getenv("BACKEND_API_URL", "http://localhost:3000").rstrip("/")
        self.backend_origin = self._get_backend_origin(self.backend_api_url)
        self.pdf_base_url = os.getenv("PDF_BASE_URL", "http://localhost:3001").rstrip("/")
        self.material_summary_cache: dict[tuple[int, int, str], str] = {}

        pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

    def ask_question(self, class_id: int, user_id: int, question: str) -> dict[str, Any]:
        _ = user_id
        original_question = (question or "").strip()
        if not original_question:
            raise ValueError("Question is required.")

        rewritten_question = self.qwen_service.rewrite_question(original_question)
        search_question = rewritten_question.strip() if rewritten_question else original_question

        print(f"Original question: {original_question}")
        print(f"Rewritten question: {rewritten_question or ''}")
        print(f"Search question used: {search_question}")

        question_vector = self.embedding_service.embed_text(search_question)

        qa_results = self.vector_store.search_questions(
            question_vector, class_id, limit=1
        )
        print("QA results:", len(qa_results))
        print("QA best score:", qa_results[0].score if qa_results else None)

        if qa_results:
            top_match = qa_results[0]
            payload = top_match.payload or {}
            if (
                float(top_match.score) >= self.QA_MATCH_THRESHOLD
                and payload.get("answer_text")
            ):
                clean_answer = self.clean_ai_text(payload["answer_text"])
                return {
                    "status": "answered",
                    "answer": clean_answer,
                    "source_type": "previous_qa",
                    "source_id": str(payload.get("question_id") or payload.get("answer_id")),
                    "confidence": round(float(top_match.score), 4),
                }

        material_results = self.vector_store.search_materials(
            question_vector, class_id, limit=self.MATERIAL_CONTEXT_LIMIT
        )
        print("Material results:", len(material_results))
        print(
            "Material best score:",
            material_results[0].score if material_results else None,
        )

        if not material_results:
            return {"status": "sent_to_doctor"}

        top_material_match = material_results[0]
        if float(top_material_match.score) < self.MATERIAL_MATCH_THRESHOLD:
            return {"status": "sent_to_doctor"}

        context_items = []
        for match in material_results:
            payload = match.payload or {}
            context_items.append(
                {
                    "material_id": payload.get("material_id"),
                    "source_name": payload.get("source_name", "Class Material"),
                    "page_number": payload.get("page_number"),
                    "chunk_index": payload.get("chunk_index"),
                    "chunk_text": payload.get("chunk_text", ""),
                    "summary": payload.get("summary", ""),
                    "material_summary": payload.get("material_summary", ""),
                    "score": float(match.score),
                }
            )

        print("🚀 ENTERING MATERIAL ANSWER GENERATION")
        page_numbers_used = [
            item["page_number"] for item in context_items if item.get("page_number") is not None
        ]
        top_context_item = context_items[0] if context_items else {}
        top_chunk_index = top_context_item.get("chunk_index")
        summary_used = any(
            item.get("material_summary") or item.get("summary") for item in context_items
        )
        highlight = self._build_highlight(top_context_item)
        top_page_number = top_context_item.get("page_number")
        if top_page_number is None and page_numbers_used:
            top_page_number = page_numbers_used[0]

        print(f"[RAG] Page numbers used: {page_numbers_used}")
        print(f"[RAG] Selected top chunk index: {top_chunk_index}")
        print(f"[RAG] Summary used: {summary_used}")
        print(f"[RAG] Highlight preview: {highlight[:160]}")
        qwen_result = self.qwen_service.answer_question(
            question=original_question,
            context_items=context_items,
        )

        if (
            qwen_result.get("decision") != "answered"
            or not qwen_result.get("answer")
            or float(qwen_result.get("confidence", 0.0))
            < self.ANSWER_CONFIDENCE_THRESHOLD
        ):
            return {"status": "sent_to_doctor"}

        combined_confidence = (
            float(top_material_match.score) + float(qwen_result["confidence"])
        ) / 2
        top_payload = top_material_match.payload or {}
        clean_answer = self.clean_ai_text(qwen_result["answer"])
        clean_highlight = self.clean_ai_text(highlight, plain_text=True, max_length=500)
        print(f"[ASK] Raw output preview: {str(qwen_result['answer'])[:200]}")
        print(f"[ASK] Cleaned output preview: {clean_answer[:200]}")
        if not clean_answer:
            return {"status": "sent_to_doctor"}

        return {
            "status": "answered",
            "answer": clean_answer,
            "source_type": "material",
            "source_id": str(top_payload.get("material_id", "")),
            **({"page": top_page_number} if top_page_number is not None else {}),
            "highlight": clean_highlight,
            "confidence": round(combined_confidence, 4),
        }

    def index_class(self, class_id: int) -> dict[str, Any]:
        print(f"[INDEX] Indexing class_id: {class_id}")
        question_payloads = self.backend_client.get_class_questions(class_id)
        material_rows = self.backend_client.get_class_materials(class_id)

        indexed_questions = []
        for question in question_payloads:
            record = self._build_indexable_question_record(question)
            if not record:
                continue

            indexed_questions.append(
                {
                    **record,
                    "vector": self.embedding_service.embed_text(record["question_text"]),
                }
            )

        indexed_material_chunks = []
        for material in material_rows:
            indexed_material_chunks.extend(self._build_material_chunks(material))

        self.vector_store.bulk_replace_questions(class_id, indexed_questions)
        self.vector_store.bulk_replace_materials(class_id, indexed_material_chunks)
        print(f"[INDEX] Total material chunks inserted: {len(indexed_material_chunks)}")

        return {
            "success": True,
            "class_id": class_id,
            "questions_indexed": len(indexed_questions),
            "material_chunks_indexed": len(indexed_material_chunks),
        }

    def index_question(
        self, question_id: int, payload: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        _ = payload
        question = self.backend_client.get_question(question_id)
        record = self._build_indexable_question_record(question)
        if not record or not record.get("answer_text"):
            return {
                "success": True,
                "indexed": False,
                "reason": "No answered question found for indexing.",
            }

        record_with_vector = {
            **record,
            "vector": self.embedding_service.embed_text(record["question_text"]),
        }
        self.vector_store.replace_question(record_with_vector)

        return {
            "success": True,
            "indexed": True,
            "question_id": question_id,
        }

    def index_material(
        self, material_id: int, payload: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        _ = payload
        material = self.backend_client.get_material(material_id)
        if not material:
            return {
                "success": True,
                "indexed": False,
                "reason": "Material not found.",
            }

        chunks = self._build_material_chunks(material)
        if not chunks:
            return {
                "success": True,
                "indexed": False,
                "reason": "No material text was available for indexing.",
            }

        self.vector_store.replace_material_chunks(material_id, chunks)
        print(f"[INDEX] Total material chunks inserted: {len(chunks)}")

        return {
            "success": True,
            "indexed": True,
            "material_id": material_id,
            "chunks_indexed": len(chunks),
        }

    def summarize_material_content(
        self, class_id: int, material_id: int, mode: str = "simple"
    ) -> dict[str, Any]:
        normalized_mode = (mode or "simple").strip().lower() or "simple"
        if normalized_mode not in {"exam", "simple", "detailed"}:
            normalized_mode = "simple"

        cache_key = (class_id, material_id, normalized_mode)
        if cache_key in self.material_summary_cache:
            cached_summary = self.material_summary_cache[cache_key]
            print(f"[SUMMARY] Using in-memory cached summary for material {material_id}")
            print(f"[SUMMARY] Summary preview: {cached_summary[:200]}")
            if not cached_summary:
                return {
                    "status": "error",
                    "message": "Summary output was empty after cleaning",
                }
            return {
                "status": "success",
                "material_id": material_id,
                "mode": normalized_mode,
                "summary": cached_summary,
            }

        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {
                "status": "error",
                "message": "Material not indexed",
            }

        cached_payload_summary = ""
        if normalized_mode == "simple":
            cached_payload_summary = (
                str(chunks[0].get("material_summary") or "").strip()
                if chunks
                else ""
            )
            if cached_payload_summary:
                clean_cached_summary = self.clean_ai_text(
                    cached_payload_summary,
                    max_length=800,
                )
                self.material_summary_cache[cache_key] = clean_cached_summary
                print(f"[SUMMARY] Using payload cached summary for material {material_id}")
                print(f"[SUMMARY] Chunks count: {len(chunks)}")
                print(f"[SUMMARY] Context length: {len(cached_payload_summary)}")
                print(f"[SUMMARY] Raw output preview: {cached_payload_summary[:200]}")
                print(f"[SUMMARY] Cleaned output preview: {clean_cached_summary[:200]}")
                print(f"[SUMMARY] Cleaned output length: {len(clean_cached_summary)}")
                print(f"[SUMMARY] Sections detected: {self._count_markdown_sections(clean_cached_summary)}")
                if not clean_cached_summary:
                    return {
                        "status": "error",
                        "message": "Summary output was empty after cleaning",
                    }
                return {
                    "status": "success",
                    "material_id": material_id,
                    "mode": normalized_mode,
                    "summary": clean_cached_summary,
                }

        combined_text = self.build_material_context(chunks, max_chars=100000)
        limited_context = combined_text[:5000]

        if not limited_context:
            return {
                "status": "error",
                "message": "Material not indexed",
            }

        print(f"[SUMMARY] Chunks count: {len(chunks)}")
        print(f"[SUMMARY] Total text length: {len(combined_text)}")
        print(f"[SUMMARY] Context length: {len(limited_context)}")
        if len(limited_context) < 300:
            print("[SUMMARY] Material text is short; generating a brief summary")

        summary = self.qwen_service.generate_material_summary(
            limited_context,
            mode=normalized_mode,
        )
        if not summary:
            return {
                "status": "error",
                "message": "Failed to generate summary",
            }

        print(f"[SUMMARY] Raw output preview: {summary[:200]}")
        normalized_summary = self.clean_ai_text(summary, max_length=800)
        self.material_summary_cache[cache_key] = normalized_summary
        print(f"[SUMMARY] Cleaned output preview: {normalized_summary[:200]}")
        print(f"[SUMMARY] Cleaned output length: {len(normalized_summary)}")
        print(f"[SUMMARY] Sections detected: {self._count_markdown_sections(normalized_summary)}")
        if not normalized_summary:
            return {
                "status": "error",
                "message": "Summary output was empty after cleaning",
            }

        return {
            "status": "success",
            "material_id": material_id,
            "mode": normalized_mode,
            "summary": normalized_summary,
        }

    def generate_page_summaries(self, class_id: int, material_id: int) -> dict[str, Any]:
        print(f"[PAGE_SUMMARIES] class_id={class_id} material_id={material_id}")
        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {
                "status": "error",
                "message": "Material not indexed",
            }

        print(f"[PAGE_SUMMARIES] Chunks count: {len(chunks)}")
        pages: dict[int, list[dict[str, Any]]] = {}
        for chunk in chunks:
            page_number = chunk.get("page_number")
            if page_number is None:
                continue
            pages.setdefault(int(page_number), []).append(chunk)

        page_summaries = []
        for page_number in sorted(pages.keys()):
            page_chunks = pages[page_number]
            page_text = self.build_material_context(page_chunks, max_chars=6000)
            raw_summary = self.qwen_service.summarize_page(page_text) or ""
            summary = self.clean_ai_text(raw_summary)
            print(
                f"[PAGE_SUMMARIES] page={page_number} context_length={len(page_text)} "
                f"raw_output_preview={raw_summary[:120]}"
            )
            print(f"[PAGE_SUMMARIES] cleaned_output_preview={summary[:120]}")
            if not summary:
                return {
                    "status": "error",
                    "message": "Page summary output was empty after cleaning",
                }
            page_summaries.append(
                {
                    "page": page_number,
                    "summary": summary,
                }
            )

        return {
            "status": "success",
            "material_id": material_id,
            "page_summaries": page_summaries,
        }

    def generate_material_notes(self, class_id: int, material_id: int) -> dict[str, Any]:
        print(f"[NOTES] class_id={class_id} material_id={material_id}")
        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {
                "status": "error",
                "message": "Material not indexed",
            }

        context = self.build_material_context(chunks, max_chars=6000)
        print(f"[NOTES] Chunks count: {len(chunks)}")
        print(f"[NOTES] Context length: {len(context)}")

        raw_notes = self.qwen_service.generate_study_notes(context) or ""
        notes = self.clean_ai_text(raw_notes, max_length=1500)
        print(f"[NOTES] Raw output preview: {raw_notes[:200]}")
        print(f"[NOTES] Cleaned output preview: {notes[:200]}")
        print(f"[NOTES] Cleaned output length: {len(notes)}")
        print(f"[NOTES] Sections detected: {self._count_markdown_sections(notes)}")
        if not notes:
            return {
                "status": "error",
                "message": "Notes output was empty after cleaning",
            }

        return {
            "status": "success",
            "material_id": material_id,
            "notes": notes,
        }

    def generate_material_quiz(
        self, class_id: int, material_id: int, num_questions: int
    ) -> dict[str, Any]:
        print(f"[QUIZ] class_id={class_id} material_id={material_id}")
        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {
                "status": "error",
                "message": "Material not indexed",
            }

        clamped_questions = max(1, min(20, int(num_questions)))
        context = self.build_material_context(chunks, max_chars=6000)
        print(f"[QUIZ] Chunks count: {len(chunks)}")
        print(f"[QUIZ] Context length: {len(context)}")

        raw_output = self.qwen_service.generate_quiz(context, clamped_questions) or ""
        print(f"[QUIZ] Raw output preview: {raw_output[:200]}")
        print(f"[QUIZ] Cleaned output preview: {self.clean_markdown_fences(raw_output)[:200]}")
        try:
            parsed_quiz = self.parse_llm_json_output(raw_output)
            sanitized_quiz = self._sanitize_quiz_items(parsed_quiz)
            print(f"[QUIZ] Parse success: {bool(sanitized_quiz)}")
            print(f"[QUIZ] Valid questions returned: {len(sanitized_quiz)}")
        except ValueError:
            print("[QUIZ] Parse failure")
            return {
                "status": "error",
                "message": "Failed to parse LLM JSON output",
                "raw_output": self.clean_markdown_fences(raw_output),
            }
        if not sanitized_quiz:
            print("[QUIZ] Parse failure")
            return {
                "status": "error",
                "message": "Failed to parse LLM JSON output",
                "raw_output": self.clean_markdown_fences(raw_output),
            }

        return {
            "status": "success",
            "material_id": material_id,
            "quiz": sanitized_quiz,
        }

    def generate_material_flashcards(
        self, class_id: int, material_id: int, num_cards: int
    ) -> dict[str, Any]:
        print(f"[FLASHCARDS] class_id={class_id} material_id={material_id}")
        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {
                "status": "error",
                "message": "Material not indexed",
            }

        clamped_cards = max(1, min(30, int(num_cards)))
        context = self.build_material_context(chunks, max_chars=6000)
        print(f"[FLASHCARDS] Chunks count: {len(chunks)}")
        print(f"[FLASHCARDS] Context length: {len(context)}")

        raw_output = self.qwen_service.generate_flashcards(context, clamped_cards) or ""
        print(f"[FLASHCARDS] Raw output preview: {raw_output[:200]}")
        print(
            f"[FLASHCARDS] Cleaned output preview: {self.clean_markdown_fences(raw_output)[:200]}"
        )
        try:
            parsed_flashcards = self.parse_llm_json_output(raw_output)
            sanitized_flashcards = self._sanitize_flashcards(parsed_flashcards)
            print(f"[FLASHCARDS] Parse success: {bool(sanitized_flashcards)}")
            print(f"[FLASHCARDS] Valid cards returned: {len(sanitized_flashcards)}")
        except ValueError:
            print("[FLASHCARDS] Parse failure")
            return {
                "status": "error",
                "message": "Failed to parse LLM JSON output",
                "raw_output": self.clean_markdown_fences(raw_output),
            }
        if not sanitized_flashcards:
            print("[FLASHCARDS] Parse failure")
            return {
                "status": "error",
                "message": "Failed to parse LLM JSON output",
                "raw_output": self.clean_markdown_fences(raw_output),
            }

        return {
            "status": "success",
            "material_id": material_id,
            "flashcards": sanitized_flashcards,
        }

    def _build_indexable_question_record(
        self, question: dict[str, Any] | None
    ) -> dict[str, Any] | None:
        if not question:
            return None

        answers = question.get("answers") or []
        if not answers:
            return None

        top_answer = answers[0]
        answer_text = (top_answer.get("answer_text") or "").strip()
        question_text = (question.get("question_text") or "").strip()

        if not answer_text or not question_text:
            return None

        return {
            "question_id": question["question_id"],
            "class_id": question["class_id"],
            "question_text": question_text,
            "answer_id": top_answer.get("answer_id"),
            "answer_text": answer_text,
        }

    def _build_material_chunks(self, material: dict[str, Any]) -> list[dict[str, Any]]:
        material_id = material["material_id"]
        material_name = self._material_name(material)
        material_type = self._material_type(material)

        print(f"[INDEX] Material id/name/type: {material_id} / {material_name} / {material_type}")
        print(f"[INDEX] Available material keys: {sorted(material.keys())}")

        pdf_detected = self.is_pdf_material(material)
        print(f"[PDF] PDF detected: {pdf_detected}")

        selected_text = ""
        selected_text_source_field = "none"
        page_chunks: list[dict[str, Any]] = []
        resolved_file = None
        downloaded = False

        if pdf_detected:
            resolved_file, downloaded = self._resolve_material_file_with_meta(material)
            print(f"[PDF] Resolved file: {resolved_file}")
            print(f"[PDF] File downloaded: {downloaded}")
            print(f"[PDF] OCR enabled: {self.enable_ocr}")

            if resolved_file:
                try:
                    pages = self.extract_pdf_text_with_pages(resolved_file)
                    selected_text = "\n\n".join(page["text"] for page in pages if page["text"]).strip()
                    selected_text_source_field = "pdf_extracted_text"
                    print(f"[PDF] Extracted text length: {len(selected_text)}")
                    page_chunks = self.chunk_text_with_pages(
                        pages,
                        chunk_size=self.pdf_chunk_size,
                        overlap=self.pdf_chunk_overlap,
                    )
                except Exception as exc:
                    print(f"[PDF] Extraction failed: {exc}")
                finally:
                    if downloaded and resolved_file:
                        self._cleanup_temp_file(resolved_file)

        if not selected_text:
            selected_text, selected_text_source_field = self.get_material_text(material)
            if selected_text:
                page_chunks = [
                    {
                        "text": chunk_text,
                        "page_number": None,
                        "chunk_index": index,
                        "text_source_field": selected_text_source_field,
                    }
                    for index, chunk_text in enumerate(
                        self._chunk_text(
                            selected_text,
                            chunk_size=self.pdf_chunk_size,
                            overlap=self.pdf_chunk_overlap,
                        )
                    )
                    if chunk_text.strip()
                ]

        print(f"[INDEX] Selected text source field: {selected_text_source_field}")
        print(f"[INDEX] Selected text length: {len(selected_text)}")
        print(f"[INDEX] First 200 chars preview: {selected_text[:200]}")

        if len(selected_text) < 50:
            print("WARNING: Material text is too short; retrieval quality may be poor")

        if not selected_text:
            print("[INDEX] No usable material text found after source selection")
            return []

        if self.enable_material_summary:
            print("[INDEX] Material summarization enabled")
            material_summary = self.qwen_service.summarize_material(selected_text) or ""
        else:
            print("Material summarization skipped because ENABLE_MATERIAL_SUMMARY=false")
            material_summary = ""

        chunk_records = []
        for chunk in page_chunks:
            chunk_text = chunk["text"]
            if self.enable_material_summary:
                chunk_summary = self.qwen_service.summarize_pdf_chunk(chunk_text) or ""
            else:
                chunk_summary = ""

            chunk_records.append(
                {
                    "class_id": material["class_id"],
                    "material_id": material_id,
                    "material_name": material_name,
                    "material_type": material_type,
                    "text": chunk_text,
                    "chunk_text": chunk_text,
                    "summary": chunk_summary,
                    "material_summary": material_summary,
                    "page_number": chunk.get("page_number"),
                    "chunk_index": chunk["chunk_index"],
                    "source_type": "material",
                    "text_source_field": chunk["text_source_field"],
                    "source_name": material_name,
                }
            )

        print(f"[INDEX] Number of chunks created: {len(chunk_records)}")
        first_chunk_preview = (
            chunk_records[0]["text"][:200] + ("..." if len(chunk_records[0]["text"]) > 200 else "")
            if chunk_records
            else ""
        )
        print(f"[INDEX] First chunk preview: {first_chunk_preview}")
        summary_preview = (
            chunk_records[0]["summary"][:160] + ("..." if len(chunk_records[0]["summary"]) > 160 else "")
            if chunk_records and chunk_records[0]["summary"]
            else ""
        )
        print(f"[INDEX] Summary preview: {summary_preview}")

        if not chunk_records:
            return []

        vectors = self.embedding_service.embed_texts([chunk["text"] for chunk in chunk_records])
        for chunk, vector in zip(chunk_records, vectors):
            chunk["vector"] = vector

        return chunk_records

    def is_pdf_material(self, material: dict) -> bool:
        material_type = self._clean_material_value(material.get("type")).lower()
        if material_type == "pdf":
            return True

        reference = self._get_material_reference(material).lower()
        return reference.endswith(".pdf")

    def resolve_material_file(self, material: dict) -> str | None:
        resolved_file, _ = self._resolve_material_file_with_meta(material)
        return resolved_file

    def _resolve_material_file_with_meta(self, material: dict) -> tuple[str | None, bool]:
        reference = self._get_material_reference(material)
        if not reference:
            return None, False

        if self._is_remote_reference(reference):
            url = self._to_absolute_url(reference)
            print(f"[PDF] Resolved PDF URL: {url}")
            print(f"[PDF] Downloading file from URL: {url}")
            return self._download_remote_file(url), True

        candidate = Path(reference)
        if candidate.is_absolute() and candidate.exists():
            return str(candidate), False

        search_paths = [
            Path(reference),
            Path(__file__).resolve().parents[1] / reference,
            Path(__file__).resolve().parents[1] / "backend" / reference,
            Path(__file__).resolve().parents[1] / "backend" / "uploads" / Path(reference).name,
        ]

        for path_candidate in search_paths:
            if path_candidate.exists():
                return str(path_candidate.resolve()), False

        if Path(reference).suffix.lower() == ".pdf":
            url = self._to_absolute_url(reference)
            print(f"[PDF] Resolved PDF URL: {url}")
            print(f"[PDF] Downloading file from URL: {url}")
            return self._download_remote_file(url), True

        return None, False

    def extract_pdf_text_with_pages(self, file_path: str) -> list[dict]:
        pages: list[dict] = []
        document = fitz.open(file_path)

        try:
            for page_index in range(document.page_count):
                page_number = page_index + 1
                page = document.load_page(page_index)
                text = self.clean_extracted_text(page.get_text("text"))
                source = "pdf_text"

                if self._is_meaningful_pdf_text(text):
                    print(f"[PDF] Page {page_number} source: pdf_text length: {len(text)}")
                    pages.append(
                        {
                            "page_number": page_number,
                            "text": text,
                            "source": source,
                        }
                    )
                    continue

                if not self.enable_ocr:
                    print("PDF text extraction returned empty text. OCR is disabled.")
                    print(f"[PDF] Page {page_number} source: none length: 0")
                    continue

                try:
                    pixmap = page.get_pixmap(dpi=200)
                    mode = "RGBA" if pixmap.alpha else "RGB"
                    image = Image.frombytes(
                        mode, [pixmap.width, pixmap.height], pixmap.samples
                    )
                    ocr_text = self.clean_extracted_text(
                        pytesseract.image_to_string(image, lang="eng")
                    )
                    if ocr_text:
                        print(f"[PDF] Page {page_number} source: pdf_ocr_text length: {len(ocr_text)}")
                        pages.append(
                            {
                                "page_number": page_number,
                                "text": ocr_text,
                                "source": "pdf_ocr_text",
                            }
                        )
                    else:
                        print(f"[PDF] Page {page_number} source: pdf_ocr_text length: 0")
                except Exception as exc:
                    print(f"[PDF] OCR failed on page {page_number}: {exc}")
                    continue
        finally:
            document.close()

        if not pages:
            if self.enable_ocr:
                print(
                    "PDF text extraction returned empty text. OCR may have failed or the scan quality is poor."
                )
            else:
                print("PDF text extraction returned empty text. OCR is disabled.")

        return pages

    def clean_extracted_text(self, text: str) -> str:
        normalized = (text or "").replace("\x00", "")
        lines = []
        previous_blank = False

        for raw_line in normalized.splitlines():
            line = raw_line.replace("\t", " ")
            line = re.sub(r"[^\S\r\n]+", " ", line).strip()
            if not line:
                if not previous_blank:
                    lines.append("")
                previous_blank = True
                continue

            lines.append(line)
            previous_blank = False

        cleaned = "\n".join(lines).strip()
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned

    def chunk_text_with_pages(
        self, pages: list[dict], chunk_size: int = 900, overlap: int = 150
    ) -> list[dict]:
        chunks: list[dict] = []

        for page in pages:
            normalized = " ".join((page.get("text") or "").split())
            if not normalized:
                continue

            start = 0
            while start < len(normalized):
                end = min(start + chunk_size, len(normalized))
                if end < len(normalized):
                    boundary = normalized.rfind(" ", start, end)
                    if boundary > start + (chunk_size // 2):
                        end = boundary

                chunk_text = normalized[start:end].strip()
                if chunk_text:
                    chunks.append(
                        {
                            "text": chunk_text,
                            "page_number": page["page_number"],
                            "chunk_index": len(chunks),
                            "text_source_field": (
                                "pdf_extracted_text"
                                if page.get("source") == "pdf_text"
                                else "pdf_ocr_text"
                            ),
                        }
                    )

                if end >= len(normalized):
                    break

                start = max(end - overlap, start + 1)

        return chunks

    def get_material_text(self, material: dict) -> tuple[str, str]:
        document_candidates = [
            ("Document", self._clean_material_value(material.get("Document"))),
            ("document", self._clean_material_value(material.get("document"))),
        ]

        for field_name, value in document_candidates:
            if value and self._is_long_plain_text(value):
                return value, field_name

        for field_name in (
            "content",
            "text",
            "body",
            "summarize",
            "summary",
            "description",
        ):
            value = self._clean_material_value(material.get(field_name))
            if value:
                return value, field_name

        for field_name in ("name", "title"):
            value = self._clean_material_value(material.get(field_name))
            if value:
                return value, field_name

        return "", "none"

    def _get_material_reference(self, material: dict[str, Any]) -> str:
        for key in ("url", "Document", "document", "file_path", "path", "absolute_document_path"):
            value = self._clean_material_value(material.get(key))
            if value:
                return value
        return ""

    def _to_absolute_url(self, reference: str) -> str:
        if reference.startswith(("http://", "https://")):
            return reference
        if reference.startswith("/files"):
            return urljoin(f"{self.pdf_base_url}/", reference.lstrip("/"))
        if reference.startswith("/"):
            return urljoin(f"{self.backend_origin}/", reference.lstrip("/"))

        encoded_reference = requests.utils.requote_uri(reference)
        return urljoin(f"{self.pdf_base_url}/files/", encoded_reference)

    def _download_remote_file(self, url: str) -> str:
        response = requests.get(url, timeout=120)
        response.raise_for_status()

        suffix = Path(urlparse(url).path).suffix or ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(response.content)
            return temp_file.name

    def _cleanup_temp_file(self, file_path: str) -> None:
        try:
            Path(file_path).unlink(missing_ok=True)
        except Exception as exc:
            print(f"[PDF] Failed to clean up temp file {file_path}: {exc}")

    def _is_remote_reference(self, reference: str) -> bool:
        return reference.startswith(("http://", "https://", "/"))

    def _is_meaningful_pdf_text(self, text: str) -> bool:
        return len((text or "").strip()) >= 60

    def _is_long_plain_text(self, value: str) -> bool:
        if len(value) <= 100:
            return False
        return not self._looks_like_file_reference(value)

    def _looks_like_file_reference(self, value: str) -> bool:
        normalized = value.strip().lower()
        if not normalized:
            return False
        if normalized.startswith(("http://", "https://", "file://", "/")):
            return True
        suffix = Path(normalized).suffix.lower()
        return suffix in {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".md"}

    def _clean_material_value(self, value: Any) -> str:
        return str(value).strip() if value and str(value).strip() else ""

    def _material_name(self, material: dict[str, Any]) -> str:
        return (
            self._clean_material_value(material.get("title"))
            or self._clean_material_value(material.get("name"))
            or "Class Material"
        )

    def _material_type(self, material: dict[str, Any]) -> str:
        material_type = self._clean_material_value(material.get("type"))
        if material_type:
            return material_type

        reference = self._get_material_reference(material)
        if reference:
            suffix = Path(reference).suffix.lower().lstrip(".")
            if suffix:
                return suffix

        return "material"

    def _chunk_text(
        self, text: str, chunk_size: int = 900, overlap: int = 150
    ) -> list[str]:
        normalized = " ".join((text or "").split())
        if not normalized:
            return []

        chunks = []
        start = 0
        text_length = len(normalized)

        while start < text_length:
            end = min(start + chunk_size, text_length)
            if end < text_length:
                boundary = normalized.rfind(" ", start, end)
                if boundary > start + (chunk_size // 2):
                    end = boundary

            chunk = normalized[start:end].strip()
            if chunk:
                chunks.append(chunk)

            if end >= text_length:
                break

            start = max(end - overlap, start + 1)

        return chunks

    def get_material_chunks(self, class_id: int, material_id: int) -> list[dict[str, Any]]:
        records, _ = self.vector_store.client.scroll(
            collection_name=self.vector_store.MATERIAL_COLLECTION,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="class_id",
                        match=models.MatchValue(value=class_id),
                    ),
                    models.FieldCondition(
                        key="material_id",
                        match=models.MatchValue(value=material_id),
                    ),
                ]
            ),
            with_payload=True,
            with_vectors=False,
            limit=1000,
        )

        payloads = [(point.payload or {}) for point in records]
        payloads.sort(key=lambda item: int(item.get("chunk_index", 0) or 0))
        return payloads

    def build_material_context(
        self, chunks: list[dict[str, Any]], max_chars: int = 6000
    ) -> str:
        text_parts = []
        total_length = 0

        for chunk in chunks:
            chunk_text = str(chunk.get("chunk_text") or chunk.get("text") or "").strip()
            if not chunk_text:
                continue

            remaining = max_chars - total_length
            if remaining <= 0:
                break

            if len(chunk_text) > remaining:
                text_parts.append(chunk_text[:remaining].strip())
                total_length = max_chars
                break

            text_parts.append(chunk_text)
            total_length += len(chunk_text) + 2

        return "\n\n".join(part for part in text_parts if part).strip()

    def clean_markdown_fences(self, text: str) -> str:
        cleaned = (text or "").strip()
        cleaned = re.sub(
            r"^\s*```(?:json|markdown|text)?\s*$",
            "",
            cleaned,
            flags=re.IGNORECASE | re.MULTILINE,
        )
        cleaned = re.sub(r"^\s*```\s*$", "", cleaned, flags=re.MULTILINE)

        if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {'"', "'"}:
            inner = cleaned[1:-1].strip()
            if inner and (
                "\\n" in inner
                or "\n" in inner
                or inner.startswith(("-", "*", "#", "{", "["))
            ):
                cleaned = inner

        return cleaned.strip()

    def parse_llm_json_output(self, raw: str) -> Any:
        cleaned = self.clean_markdown_fences(raw)
        candidate = self._extract_json_candidate(cleaned)
        if not candidate:
            raise ValueError("No JSON content found in LLM output")

        try:
            return json.loads(candidate)
        except json.JSONDecodeError as exc:
            print(f"[LLM_JSON] Original parse failed: {exc}")

        repaired_candidate = self._repair_json_latex_escapes(candidate)
        if repaired_candidate != candidate:
            try:
                parsed = json.loads(repaired_candidate)
                print("[LLM_JSON] Repaired parse succeeded with LaTeX escape fix")
                return parsed
            except json.JSONDecodeError as exc:
                print(f"[LLM_JSON] Repaired parse failed: {exc}")
        else:
            print("[LLM_JSON] No LaTeX escape repair changes were needed")

        literal_eval_candidate = self._normalize_json_like_literal(repaired_candidate)
        try:
            parsed = ast.literal_eval(literal_eval_candidate)
            if isinstance(parsed, (list, dict)):
                print("[LLM_JSON] Fallback literal_eval parse succeeded")
                return parsed
            print("[LLM_JSON] Fallback literal_eval parse returned unsupported type")
        except (ValueError, SyntaxError) as exc:
            print(f"[LLM_JSON] Fallback literal_eval parse failed: {exc}")

        raise ValueError("Failed to parse LLM JSON output")

    def clean_ai_text(
        self, text: str, plain_text: bool = False, max_length: int | None = None
    ) -> str:
        cleaned = self.clean_markdown_fences(text)
        cleaned = self.normalize_markdown_output(cleaned)
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        cleaned = "\n".join(line.rstrip() for line in cleaned.split("\n")).strip()

        if plain_text:
            cleaned = " ".join(cleaned.split())

        if max_length and len(cleaned) > max_length:
            if plain_text:
                trimmed = cleaned[:max_length].rsplit(" ", 1)[0].strip()
            else:
                trimmed = cleaned[:max_length].rstrip()
            cleaned = f"{trimmed}..."

        return cleaned

    def normalize_markdown_output(self, text: str) -> str:
        normalized = (text or "").strip()
        normalized = normalized.replace("\\r\\n", "\n").replace("\\n", "\n")
        normalized = normalized.replace("\\t", "    ")
        normalized = normalized.replace('\\"', '"')

        intro_patterns = [
            r"^\s*Certainly!?[\s,:-]*",
            r"^\s*Of course!?[\s,:-]*",
            r"^\s*Here is(?: the)?(?: requested)?(?: summary| answer| notes| page summary)?\s*:?\s*",
            r"^\s*Sure,?\s+here(?: is| are)(?: the)?(?: requested)?(?: summary| answer| notes| page summary)?\s*:?\s*",
            r"^\s*Below is(?: the)?(?: requested)?(?: summary| answer| notes| page summary)?\s*:?\s*",
        ]
        for pattern in intro_patterns:
            normalized = re.sub(pattern, "", normalized, flags=re.IGNORECASE)

        normalized = re.sub(r"\\\((.+?)\\\)", r"$\1$", normalized, flags=re.DOTALL)
        normalized = re.sub(r"\\\[(.+?)\\\]", r"$$\1$$", normalized, flags=re.DOTALL)
        normalized = re.sub(r"(?m)^[ \t]*(#{1,6})([^ #\n])", r"\1 \2", normalized)

        lines = []
        seen_headings: set[str] = set()
        previous_line = ""
        for raw_line in normalized.split("\n"):
            line = raw_line.rstrip()
            stripped = line.strip()
            if stripped.startswith("• "):
                line = f"- {stripped[2:].strip()}"
            elif stripped.startswith("* ") and not stripped.startswith("**"):
                line = f"- {stripped[2:].strip()}"
            elif stripped and not stripped.startswith(("#", "-", "*")) and len(stripped) > 220:
                line = f"- {stripped}"

            normalized_line = line.strip()
            if normalized_line.startswith("#"):
                heading_key = re.sub(r"\s+", " ", normalized_line.lower())
                if heading_key in seen_headings:
                    continue
                seen_headings.add(heading_key)

            if normalized_line and normalized_line == previous_line:
                continue

            lines.append(line)
            previous_line = normalized_line

        normalized = "\n".join(lines).strip()
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        normalized = re.sub(r"[ \t]+\n", "\n", normalized)
        return normalized

    def _count_markdown_sections(self, text: str) -> int:
        return len(re.findall(r"(?m)^#{1,6}\s+", text or ""))

    def _extract_json_candidate(self, text: str) -> str:
        candidate = (text or "").strip()
        if not candidate:
            return ""

        for opener, closer in (("[", "]"), ("{", "}")):
            start = candidate.find(opener)
            end = candidate.rfind(closer)
            if start != -1 and end != -1 and end > start:
                return candidate[start : end + 1].strip()

        return ""

    def _repair_json_latex_escapes(self, text: str) -> str:
        repaired = text

        # Escape common LaTeX delimiters inside JSON strings.
        for latex_token in (r"\(", r"\)", r"\[", r"\]"):
            repaired = repaired.replace(latex_token, latex_token.replace("\\", "\\\\"))

        # Escape single backslashes that are not valid JSON escapes.
        repaired = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r"\\\\", repaired)

        # Remove trailing commas that frequently appear in model-produced JSON.
        repaired = re.sub(r",(\s*[\]}])", r"\1", repaired)
        return repaired

    def _normalize_json_like_literal(self, text: str) -> str:
        normalized = text.strip()
        normalized = re.sub(r"\bnull\b", "None", normalized)
        normalized = re.sub(r"\btrue\b", "True", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\bfalse\b", "False", normalized, flags=re.IGNORECASE)
        return normalized

    def _sanitize_quiz_items(self, parsed: Any) -> list[dict[str, Any]]:
        if not isinstance(parsed, list):
            return []

        cleaned_items = []
        for item in parsed:
            if not isinstance(item, dict):
                continue

            question = self.clean_ai_text(str(item.get("question") or ""), plain_text=True)
            options = item.get("options")
            if not question or not isinstance(options, list) or len(options) != 4:
                continue

            clean_options = [
                self.clean_ai_text(str(option or ""), plain_text=True) for option in options
            ]
            if not all(clean_options):
                continue

            answer = self._normalize_answer_letter(item.get("answer"), clean_options)
            if answer not in {"A", "B", "C", "D"}:
                continue

            cleaned_items.append(
                {
                    "question": question,
                    "options": clean_options,
                    "answer": answer,
                }
            )

        return cleaned_items

    def _sanitize_flashcards(self, parsed: Any) -> list[dict[str, Any]]:
        if not isinstance(parsed, list):
            return []

        cleaned_items = []
        for item in parsed:
            if not isinstance(item, dict):
                continue

            term = self.clean_ai_text(str(item.get("term") or ""), plain_text=True)
            definition = self.clean_ai_text(str(item.get("definition") or ""))
            if not term or not definition:
                continue

            cleaned_items.append(
                {
                    "term": term,
                    "definition": definition,
                }
            )

        return cleaned_items

    def _normalize_answer_letter(self, answer: Any, options: list[str]) -> str:
        normalized = self.clean_ai_text(str(answer or ""), plain_text=True).upper()
        if normalized in {"A", "B", "C", "D"}:
            return normalized

        option_labels = ["A", "B", "C", "D"]
        for index, option in enumerate(options):
            option_text = self.clean_ai_text(option, plain_text=True)
            if normalized == option_text.upper():
                return option_labels[index]
            if normalized.startswith(f"{option_labels[index]}.") or normalized.startswith(
                f"{option_labels[index]})"
            ):
                return option_labels[index]

        return ""

    def _build_highlight(self, item: dict[str, Any] | None) -> str:
        if not item:
            return ""

        raw_text = (
            item.get("chunk_text")
            or item.get("text")
            or item.get("summary")
            or item.get("material_summary")
            or ""
        )
        cleaned = self.clean_ai_text(str(raw_text), plain_text=True)
        if not cleaned:
            return ""

        max_length = 500
        if len(cleaned) <= max_length:
            return cleaned

        preview = cleaned[:max_length].rsplit(" ", 1)[0].strip()
        return f"{preview}..."

    def _resolve_document_path(self, raw_path: str) -> Path:
        candidate = Path(raw_path)
        if candidate.is_absolute():
            return candidate

        search_paths = [
            Path(raw_path),
            Path(__file__).resolve().parents[1] / raw_path,
            Path(__file__).resolve().parents[1] / "backend" / raw_path,
            Path(__file__).resolve().parents[1] / "backend" / "uploads" / Path(raw_path).name,
        ]

        for path_candidate in search_paths:
            if path_candidate.exists():
                return path_candidate.resolve()

        return candidate.resolve()

    def _get_backend_origin(self, backend_api_url: str) -> str:
        parsed = urlparse(backend_api_url)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
        return backend_api_url.rstrip("/")
