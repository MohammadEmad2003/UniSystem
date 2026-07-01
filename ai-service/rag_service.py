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
print("RAG LOADED:", __file__)


class RagService:
    MATERIAL_MATCH_THRESHOLD = 0.20
    ANSWER_CONFIDENCE_THRESHOLD = 0.55
    MATERIAL_CONTEXT_LIMIT = 5

    # Keywords that boost chunk relevance score slightly during re-ranking.
    # These cover Fourier/signals/math topics that embedding similarity can underscore.
    _KEYWORD_BOOST_TERMS: list[str] = [
        'fourier', 'transform', 'series', 'coefficient', 'coefficients',
        'linearity', 'parseval', 'harmonic', 'frequency', 'periodic',
        'convolution', 'spectrum', 'euler', 'signal', 'laplace',
        'eigenvalue', 'orthogonal', 'integral', 'derivative',
        'discrete', 'time', 'systems', 'z-transform', 'nyquist', 'bode',
        'continuous', 'stability', 'pole', 'zero', 'response'
    ]
    _KEYWORD_BOOST_PER_HIT = 0.015   # score bonus per matched keyword (capped at 0.06)

    def __init__(self) -> None:
        self.backend_client = BackendClient()
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStore(self.embedding_service.vector_size)
        self.qwen_service = QwenService()

        self.qa_match_threshold = float(os.getenv("QA_REUSE_THRESHOLD", "0.78"))
        print(f"[CONFIG] QA_REUSE_THRESHOLD={self.qa_match_threshold}")

        self.enable_material_summary = (
            os.getenv("ENABLE_MATERIAL_SUMMARY", "false").lower() == "true"
        )
        self.enable_ocr = os.getenv("ENABLE_OCR", "true").lower() == "true"
        self.tesseract_cmd = os.getenv(
            "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        )
        self.pdf_chunk_size = int(os.getenv("PDF_CHUNK_SIZE", "500"))
        self.pdf_chunk_overlap = int(os.getenv("PDF_CHUNK_OVERLAP", "100"))
        self.backend_api_url = os.getenv("BACKEND_API_URL", "http://localhost:3000").rstrip("/")
        self.backend_origin = self._get_backend_origin(self.backend_api_url)
        self.pdf_base_url = os.getenv("PDF_BASE_URL", "http://localhost:3001").rstrip("/")
        self.material_summary_cache: dict[tuple[int, int, str], str] = {}

        pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

    def ask_question(self, class_id: int, user_id: int, question: str) -> dict[str, Any]:
        import time
        t_start = time.time()
        
        _ = user_id
        original_question = (question or "").strip()
        print("🔥 ENTERED ask_question")
        if not original_question:
            raise ValueError("Question is required.")

        search_question = original_question

        print(f"Original question: {original_question}")
        print(f"Search question used: {search_question}")

        t_embed = time.time()
        question_vector = self.embedding_service.embed_text(search_question)
        time_embedding = time.time() - t_embed

        print(f"[ASK] QA collection: {self.vector_store.QA_COLLECTION}")
        print(f"[ASK] class_id filter: {class_id} (type={type(class_id).__name__})")
        
        t_retrieve = time.time()
        qa_results = self.vector_store.search_questions(
            question_vector, class_id, limit=1
        )
        print(f"QA results: {len(qa_results)}")
        print(f"QA best score: {qa_results[0].score if qa_results else None}")
        print(f"[ASK] QA threshold: {self.qa_match_threshold}")

        if qa_results:
            top_match = qa_results[0]
            score = float(top_match.score)
            payload = top_match.payload or {}
            if score >= self.qa_match_threshold and payload.get("answer_text"):
                print(f"[ASK] QA match accepted (score={score:.4f} >= threshold={self.qa_match_threshold})")
                clean_answer = self.clean_ai_text(payload["answer_text"])
                return {
                    "status":      "answered",
                    "answer":      clean_answer,
                    "source":      "previous_question",
                    "source_type": "previous_qa",
                    "source_id":   str(payload.get("question_id") or payload.get("answer_id") or ""),
                    "confidence":  round(score, 4),
                    "previous_question": {
                        "question_id": str(payload.get("question_id") or ""),
                        "text":        payload.get("question_text", ""),
                        "asked_by": {
                            "id":   payload.get("asked_by_id", ""),
                            "name": payload.get("asked_by_name") or "Unknown student",
                            "role": payload.get("asked_by_role", "student"),
                        },
                        "asked_at": payload.get("asked_at", ""),
                    },
                    "previous_answer": {
                        "answer_id": str(payload.get("answer_id") or ""),
                        "text":      clean_answer,
                        "answered_by": {
                            "id":   payload.get("answered_by_id", ""),
                            "name": payload.get("answered_by_name") or "Unknown answerer",
                            "role": payload.get("answered_by_role", "doctor"),
                        },
                        "answered_at": payload.get("answered_at", ""),
                    },
                }
            else:
                reason = f"score={score:.4f} < threshold={self.qa_match_threshold}" if score < self.qa_match_threshold else "answer_text missing"
                print(f"[ASK] QA match found but skipped ({reason})")

        material_results = self.vector_store.search_materials(
            question_vector, class_id, limit=self.MATERIAL_CONTEXT_LIMIT
        )
        time_retrieval = time.time() - t_retrieve
        print(f"[RAG] Material results: {len(material_results)}")
        print(
            f"[RAG] Material best score: {material_results[0].score if material_results else None}"
        )

        # Temporary debug logs requested by the user during retrieval
        scores = [float(m.score) for m in material_results]
        preview = ""
        if material_results:
            p = material_results[0].payload or {}
            preview = str(p.get("chunk_text") or "")[:200]
            
        print("[RETRIEVE]")
        print(f"question: {original_question}")
        print(f"class_id: {class_id}")
        print(f"number of returned chunks: {len(material_results)}")
        print(f"similarity scores: {scores}")
        print(f"retrieved context preview: {preview}")

        if not material_results:
            print("[RAG] No material results — returning no_context debug response")
            return {
                "status": "no_context",
                "message": "No indexed material found for this class"
            }

        # ── Apply keyword boost re-ranking ────────────────────────────────────
        # For math/engineering questions the embedding similarity alone can be
        # slightly low; a small keyword bonus helps surface the right chunks.
        q_lower = original_question.lower()
        boosted: list[tuple[float, Any]] = []
        for m in material_results:
            base_score = float(m.score)
            chunk_text = ((m.payload or {}).get("chunk_text") or "").lower()
            hits = sum(
                1 for kw in self._KEYWORD_BOOST_TERMS
                if kw in q_lower and kw in chunk_text
            )
            bonus = min(hits * self._KEYWORD_BOOST_PER_HIT, 0.06)
            boosted.append((base_score + bonus, m))
        boosted.sort(key=lambda x: x[0], reverse=True)
        material_results = [m for _, m in boosted]

        # ── Log all retrieved chunks with scores ──────────────────────────────
        print(f"[RAG] Retrieved {len(material_results)} chunks (after keyword re-rank):")
        for i, (adj_score, m) in enumerate(boosted):
            p = m.payload or {}
            preview = str(p.get("chunk_text") or "")[:80].replace('\n', ' ')
            print(
                f"  [RAG] chunk {i}: score={adj_score:.4f} (raw={m.score:.4f})"
                f"  chunk_id={p.get('chunk_index')}  page={p.get('page_number')}"
                f"  mat={p.get('material_id')}  src={str(p.get('source_name',''))[:30]!r}"
                f"  preview={preview!r:.60}"
            )

        top_material_match = material_results[0]
        effective_top_score = boosted[0][0]
        print(
    "[DEBUG] effective_top_score:",
    effective_top_score,
    "threshold:",
    self.MATERIAL_MATCH_THRESHOLD
)
        print("========== DEBUG SCORE ==========")
        print("effective_top_score:", effective_top_score)
        print("threshold:", self.MATERIAL_MATCH_THRESHOLD)
        print("material count:", len(material_results))
        print("top chunk:", material_results[0].payload if material_results else None)
        print("=================================")
        if effective_top_score < self.MATERIAL_MATCH_THRESHOLD:
            
            return {"status": "sent_to_doctor"}

        print(f"[RAG] Top score {effective_top_score:.4f} >= threshold {self.MATERIAL_MATCH_THRESHOLD} — proceeding")

        # ── Smart chunk selection (optimized for latency) ────────
        selected_results = [material_results[0]]
        if len(boosted) >= 2:
            selected_results.append(material_results[1])
        if len(boosted) >= 3:
            score_2 = boosted[1][0]
            score_3 = boosted[2][0]
            if (score_2 - score_3) < 0.05:
                selected_results.append(material_results[2])
        print(
            f"[RAG] selected {len(selected_results)}/{len(material_results)} chunks"
        )
        print(f"[RAG] Selected top chunk: index={selected_results[0].payload.get('chunk_index') if selected_results else None}")

        context_items = []
        for match in selected_results:
            payload = match.payload or {}
            context_items.append(
                {
                    "material_id":    payload.get("material_id"),
                    "source_name":    payload.get("source_name", "Class Material"),
                    "page_number":    payload.get("page_number"),
                    "chunk_index":    payload.get("chunk_index"),
                    "chunk_text":     payload.get("chunk_text", ""),
                    "summary":        payload.get("summary", ""),
                    "material_summary": payload.get("material_summary", ""),
                    "score":          float(match.score),
                }
            )

        total_context_len = sum(len(item.get("chunk_text", "")) for item in context_items)
        
        # ── Limit context size to 700 chars ──────────────────────────────────
        current_len = 0
        for i, item in enumerate(context_items):
            chunk_len = len(item.get("chunk_text", ""))
            if current_len + chunk_len > 700:
                allowed = 700 - current_len
                if allowed > 0:
                    text = item["chunk_text"][:allowed]
                    last_period = text.rfind(". ")
                    if last_period > 0:
                        text = text[:last_period + 1]
                    item["chunk_text"] = text
                    current_len += len(text)
                else:
                    item["chunk_text"] = ""
            else:
                current_len += chunk_len
        context_items = [item for item in context_items if item.get("chunk_text")]
        
        print(f"[RAG] entering generation")
        print(f"[RAG] context length: {current_len} chars across {len(context_items)} chunks")

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

        print(f"[RAG] generation started")
        t_prompt = time.time()
        # Prompt construction is fast, mostly LLM time, but we'll measure LLM time directly inside qwen_service.
        # We will use qwen_service's printout for LLM generation time, and sum it up here.
        t_llm = time.time()
        try:
            qwen_result = self.qwen_service.answer_question(
                question=original_question,
                context_items=context_items,
            )
        except Exception as gen_exc:
            print(f"[RAG] generation FAILED with exception: {gen_exc}")
            return {"status": "sent_to_doctor"}

        time_llm = time.time() - t_llm
        time_prompt = t_llm - t_prompt
        print(f"[RAG] generation completed: decision={qwen_result.get('decision')} answer_len={len(qwen_result.get('answer',''))}")

        if (
            qwen_result.get("decision") != "answered"
            or not qwen_result.get("answer")
            or float(qwen_result.get("confidence", 0.0)) < self.ANSWER_CONFIDENCE_THRESHOLD
        ):
            reason = (
                f"decision={qwen_result.get('decision')}"
                if qwen_result.get("decision") != "answered"
                else f"confidence={qwen_result.get('confidence',0):.3f} < {self.ANSWER_CONFIDENCE_THRESHOLD}"
                if float(qwen_result.get("confidence", 0.0)) < self.ANSWER_CONFIDENCE_THRESHOLD
                else "empty answer"
            )
            print(f"[RAG] answer rejected ({reason}) — retrying with top 2 chunks only")

            # ── Retry once with top 2 chunks only ────────────────────────────
            retry_items = context_items[:2]
            try:
                qwen_result = self.qwen_service.answer_question(
                    question=original_question,
                    context_items=retry_items,
                )
                print(f"[RAG] retry completed: decision={qwen_result.get('decision')} answer_len={len(qwen_result.get('answer',''))}")
            except Exception as retry_exc:
                print(f"[RAG] retry FAILED: {retry_exc}")
                return {"status": "sent_to_doctor"}

        # ── Final answer validation ───────────────────────────────────────────
        raw_answer_text = qwen_result.get("answer", "")
        min_answer_length = 30
        if (
            qwen_result.get("decision") != "answered"
            or not raw_answer_text
            or len(raw_answer_text.strip()) < min_answer_length
        ):
            print(
                f"[RAG] Final answer invalid: decision={qwen_result.get('decision')} "
                f"len={len(raw_answer_text.strip())} < {min_answer_length} — sending to doctor"
            )
            return {"status": "sent_to_doctor"}

        combined_confidence = (
            effective_top_score + float(qwen_result["confidence"])
        ) / 2
        top_payload = top_material_match.payload or {}
        clean_answer = self.clean_ai_text(qwen_result["answer"])
        clean_highlight = self.clean_ai_text(highlight, plain_text=True, max_length=500)
        print(f"[ASK] Raw output preview: {str(qwen_result['answer'])[:200]}")
        print(f"[ASK] Cleaned output preview: {clean_answer[:200]}")
        if not clean_answer:
            return {"status": "sent_to_doctor"}

        time_total = time.time() - t_start
        print(f"=== LATENCY LOGS ===")
        print(f"Embedding time: {time_embedding:.3f}s")
        print(f"Retrieval time: {time_retrieval:.3f}s")
        print(f"Prompt construction time: {time_prompt:.3f}s")
        print(f"LLM generation time: {time_llm:.3f}s")
        print(f"Total request time: {time_total:.3f}s")
        print(f"====================")

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
        print(f"[INDEX] ── class_id={class_id} (type={type(class_id).__name__})")
        print(f"[INDEX] QA collection: {self.vector_store.QA_COLLECTION}")
        print(f"[INDEX] class_id filter will use int: {class_id}")

        # ── Fetch questions ────────────────────────────────────────────────────
        try:
            question_payloads = self.backend_client.get_class_questions(class_id) or []
        except Exception as exc:
            print(f"[INDEX] ERROR fetching questions from backend: {exc}")
            question_payloads = []

        print(f"[INDEX] Questions fetched from backend: {len(question_payloads)}")

        answered = [q for q in question_payloads if q.get("answers")]
        unanswered = len(question_payloads) - len(answered)
        print(f"[INDEX] Answered questions (have ≥1 answer): {len(answered)}")
        if unanswered:
            print(f"[INDEX] Skipped (no answers yet): {unanswered}")

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

        print(f"[INDEX] QA records inserted into Qdrant: {len(indexed_questions)}")
        if len(answered) > 0 and len(indexed_questions) == 0:
            print("[INDEX] WARNING: answered questions exist but none were indexed — check field names (question_text / answer_text)")

        # ── Fetch materials ────────────────────────────────────────────────────
        try:
            material_rows = self.backend_client.get_class_materials(class_id) or []
        except Exception as exc:
            print(f"[INDEX] ERROR fetching materials from backend: {exc}")
            material_rows = []

        indexed_material_chunks = []
        for material in material_rows:
            indexed_material_chunks.extend(self._build_material_chunks(material))

        print(f"[INDEX] deleting old QA embeddings for class_id={class_id}")
        deleted_count = self.vector_store.delete_qa_by_class(class_id)
        print(f"[INDEX] deleted count: {deleted_count}")
        self.vector_store._upsert(self.vector_store.QA_COLLECTION, [
            {**self.vector_store._qa_point(r)} for r in indexed_questions
        ])
        print(f"[INDEX] QA records inserted: {len(indexed_questions)}")
        self.vector_store.bulk_replace_materials(class_id, indexed_material_chunks)
        print(f"[INDEX] Total material chunks inserted: {len(indexed_material_chunks)}")

        return {
            "success": True,
            "class_id": class_id,
            "questions_indexed": len(indexed_questions),
            "material_chunks_indexed": len(indexed_material_chunks),
        }

    def clear_class_qa(self, class_id: int) -> dict[str, Any]:
        print(f"[INDEX] deleting old QA embeddings for class_id={class_id}")
        deleted_count = self.vector_store.delete_qa_by_class(class_id)
        print(f"[INDEX] deleted count: {deleted_count}")
        return {"success": True, "class_id": class_id, "deleted": deleted_count}

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

    def _group_texts(self, texts: list[str], max_chars: int = 4500) -> list[str]:
        groups = []
        current_group = []
        current_len = 0
        for text in texts:
            text_len = len(text)
            if current_group and current_len + text_len + 2 > max_chars:
                groups.append("\n\n".join(current_group))
                current_group = [text]
                current_len = text_len
            else:
                current_group.append(text)
                current_len += text_len + (2 if current_group else 0)
        if current_group:
            groups.append("\n\n".join(current_group))
        return groups

    def _hierarchical_summarize(
        self, chunks: list[dict], length: str, format: str, include_formulas: bool, max_chars: int = 4500
    ) -> str | None:
        print("[SUMMARY] Stage 1 started")
        texts = [chunk.get("chunk_text", "") for chunk in chunks if chunk.get("chunk_text")]
        if not texts:
            return None

        groups = self._group_texts(texts, max_chars)
        print(f"[SUMMARY] Groups: {len(groups)}")
        
        stage1_summaries = []
        for i, group_text in enumerate(groups, 1):
            print(f"[SUMMARY] Generating summary for group {i}/{len(groups)}")
            for attempt in range(2):
                summary = self.qwen_service.generate_material_summary(
                    group_text, length, format, include_formulas
                )
                if summary:
                    stage1_summaries.append(summary)
                    break
                else:
                    print(f"[SUMMARY] Group {i} failed on attempt {attempt + 1}")
        
        if not stage1_summaries:
            return None
            
        current_summaries = stage1_summaries
        
        while len(current_summaries) > 1:
            print(f"[SUMMARY] Stage 2 merging {len(current_summaries)} summaries")
            groups = self._group_texts(current_summaries, max_chars)
            
            next_summaries = []
            for i, group_text in enumerate(groups, 1):
                for attempt in range(2):
                    summary = self.qwen_service.generate_material_summary(
                        group_text, length, format, include_formulas
                    )
                    if summary:
                        next_summaries.append(summary)
                        break
                    else:
                        print(f"[SUMMARY] Merge group {i} failed on attempt {attempt + 1}")
            
            if not next_summaries:
                break
                
            current_summaries = next_summaries
            
        print("[SUMMARY] Final summary generated")
        return current_summaries[0] if current_summaries else None

    def summarize_material_content(
        self,
        class_id: int,
        material_id: int,
        mode: str = "simple",
        length: str = "medium",
        format: str = "study_notes",
        include_formulas: bool = True,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        print(f"[STUDY_AI_OPTIONS] summary  class_id={class_id}  material_id={material_id}  "
              f"length={length!r}  format={format!r}  include_formulas={include_formulas}  force_refresh={force_refresh}")

        # Keep legacy mode param for backward compat but don't drive cache on it
        normalized_mode = (mode or "simple").strip().lower() or "simple"
        if normalized_mode not in {"exam", "simple", "detailed"}:
            normalized_mode = "simple"

        # Cache key now includes all options so different option combos get fresh results
        cache_key = (class_id, material_id, length, format, include_formulas)

        if force_refresh:
            print(f"[STUDY_CACHE] bypass forceRefresh=true tool=summary material_id={material_id}")
            print(f"[SUMMARY] force_refresh=true — bypassing in-memory cache for material {material_id}")
            # Evict stale entry so the fresh result replaces it below
            self.material_summary_cache.pop(cache_key, None)
        elif cache_key in self.material_summary_cache:
            cached_summary = self.material_summary_cache[cache_key]
            print(f"[STUDY_CACHE] hit tool=summary material_id={material_id} source=in_memory")
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

        # Only use payload-embedded summary when NOT force-refreshing
        cached_payload_summary = ""
        if normalized_mode == "simple" and not force_refresh:
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
                print(f"[STUDY_CACHE] hit tool=summary material_id={material_id} source=payload")
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

        print(f"[SUMMARY] Chunks count: {len(chunks)}")
        
        summary = self._hierarchical_summarize(
            chunks=chunks,
            length=length,
            format=format,
            include_formulas=include_formulas,
        )
        if not summary:
            return {
                "status": "error",
                "message": "Failed to generate summary",
            }

        print(f"[SUMMARY] Raw output length: {len(summary)}")
        print(f"[SUMMARY] Raw output first 300: {summary[:300]}")
        print(f"[SUMMARY] Raw output last 300: {summary[-300:]}")
        normalized_summary = self.clean_ai_text(summary)
        # Always update the in-memory cache with the fresh result
        self.material_summary_cache[cache_key] = normalized_summary
        print(f"[SUMMARY] Cleaned output length: {len(normalized_summary)}")
        print(f"[SUMMARY] Cleaned first 300: {normalized_summary[:300]}")
        print(f"[SUMMARY] Cleaned last 300: {normalized_summary[-300:]}")
        print(f"[SUMMARY] Sections detected: {self._count_markdown_sections(normalized_summary)}")
        if not normalized_summary:
            return {
                "status": "error",
                "message": "Summary output was empty after cleaning",
            }

        from datetime import datetime, timezone
        return {
            "status": "success",
            "material_id": material_id,
            "mode": normalized_mode,
            "summary": normalized_summary,
            **({"regenerated": True, "generated_at": datetime.now(timezone.utc).isoformat()} if force_refresh else {}),
        }

    def generate_page_summaries(
        self,
        class_id: int,
        material_id: int,
        detail_level: str = "normal",
        include_key_terms: bool = True,
        include_formulas: bool = True,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        print(f"[PAGE_SUMMARIES] class_id={class_id} material_id={material_id}")
        print(f"[STUDY_AI_OPTIONS] page_summaries  class_id={class_id}  material_id={material_id}  "
              f"detail_level={detail_level!r}  include_key_terms={include_key_terms}  "
              f"include_formulas={include_formulas}  force_refresh={force_refresh}")
        if force_refresh:
            print(f"[STUDY_CACHE] bypass forceRefresh=true tool=page_summaries material_id={material_id}")
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
            raw_summary = self.qwen_service.summarize_page(
                page_text,
                detail_level=detail_level,
                include_key_terms=include_key_terms,
                include_formulas=include_formulas,
            ) or ""
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

    def generate_material_notes(
        self,
        class_id: int,
        material_id: int,
        notes_style: str = "bullet_notes",
        detail_level: str = "detailed",
        include_examples: bool = True,
        include_formulas: bool = True,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        print(f"[NOTES] class_id={class_id} material_id={material_id}")
        print(f"[STUDY_AI_OPTIONS] notes  class_id={class_id}  material_id={material_id}  "
              f"notes_style={notes_style!r}  detail_level={detail_level!r}  "
              f"include_examples={include_examples}  include_formulas={include_formulas}  "
              f"force_refresh={force_refresh}")
        if force_refresh:
            print(f"[STUDY_CACHE] bypass forceRefresh=true tool=notes material_id={material_id}")
        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {
                "status": "error",
                "message": "Material not indexed",
            }

        context = self.build_material_context(chunks, max_chars=6000)
        print(f"[NOTES] Chunks count: {len(chunks)}")
        print(f"[NOTES] Context length: {len(context)}")

        raw_notes = self.qwen_service.generate_study_notes(
            context,
            notes_style=notes_style,
            detail_level=detail_level,
            include_examples=include_examples,
            include_formulas=include_formulas,
        ) or ""
        notes = self.clean_ai_text(raw_notes)
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

    # ── Quiz / Flashcard validators ──────────────────────────────────────────

    def _validate_quiz(
        self, items: list[dict], num_questions: int, question_type: str
    ) -> list[str]:
        """Return a list of validation failure messages (empty = pass)."""
        issues: list[str] = []
        if len(items) < num_questions:
            issues.append(
                f"Expected {num_questions} questions, got {len(items)}"
            )
        if question_type == "mixed" and len(items) >= 5:
            mcq_count = sum(1 for q in items if q.get("type") == "mcq")
            tf_count  = sum(1 for q in items if q.get("type") == "true_false")
            min_each  = max(1, len(items) * 2 // 5)
            if mcq_count < min_each:
                issues.append(f"Mixed quiz needs ≥{min_each} MCQ, got {mcq_count}")
            if tf_count < min_each:
                issues.append(f"Mixed quiz needs ≥{min_each} True/False, got {tf_count}")
        if question_type == "true_false":
            bad = [q for q in items if len(q.get("options", [])) != 2]
            if bad:
                issues.append(f"{len(bad)} true_false items have wrong option count")
        if question_type == "mcq":
            bad = [q for q in items if len(q.get("options", [])) != 4]
            if bad:
                issues.append(f"{len(bad)} mcq items have wrong option count")
        return issues

    def _validate_flashcards(
        self, items: list[dict], num_cards: int, focus: str
    ) -> list[str]:
        """Return a list of validation failure messages (empty = pass)."""
        issues: list[str] = []
        if len(items) < num_cards:
            issues.append(f"Expected {num_cards} flashcards, got {len(items)}")
        if focus == "formulas":
            no_math = [i for i, c in enumerate(items) if "$" not in c.get("back", "")]
            if no_math:
                issues.append(f"{len(no_math)} formula cards have no LaTeX in back")
        if focus in ("key_terms", "definitions", "formulas"):
            wrong_type = [
                i for i, c in enumerate(items) if c.get("focus_type") != focus
            ]
            if wrong_type:
                issues.append(f"{len(wrong_type)} cards have wrong focus_type (expected {focus!r})")
        return issues

    def generate_material_quiz(
        self,
        class_id: int,
        material_id: int,
        num_questions: int = 10,
        difficulty: str = "mixed",
        question_type: str = "mcq",
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        print(f"[QUIZ] class_id={class_id} material_id={material_id}")
        print(f"[STUDY_AI_OPTIONS] quiz  class_id={class_id}  material_id={material_id}  "
              f"num_questions={num_questions}  difficulty={difficulty!r}  question_type={question_type!r}  "
              f"force_refresh={force_refresh}")
        if force_refresh:
            print(f"[STUDY_CACHE] bypass forceRefresh=true tool=quiz material_id={material_id}")
        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {"status": "error", "message": "Material not indexed"}

        clamped = max(1, min(20, int(num_questions)))
        context = self.build_material_context(chunks, max_chars=6000)
        print(f"[QUIZ] Chunks count: {len(chunks)}  Context length: {len(context)}")

        sanitized_quiz: list[dict] = []
        raw_output = ""

        for attempt in range(1, 3):
            retry_hint: str | None = None
            if attempt > 1:
                retry_hint = (
                    "IMPORTANT: Your previous output failed validation. "
                    "Return ONLY a valid JSON array. "
                    f"You MUST return EXACTLY {clamped} questions. "
                    "Each question MUST have 'type', 'difficulty', 'question', 'options', 'answer', 'explanation'. "
                    "No text, no markdown, no explanations outside the JSON array."
                )
            raw_output = self.qwen_service.generate_quiz(
                context, clamped,
                difficulty=difficulty,
                question_type=question_type,
                retry_prompt=retry_hint,
            ) or ""
            print(f"[QUIZ] Attempt {attempt} raw preview: {raw_output[:200]}")

            try:
                parsed_quiz = self.parse_llm_json_output(raw_output)
                sanitized_quiz = self._sanitize_quiz_items(parsed_quiz)
                total   = len(parsed_quiz) if isinstance(parsed_quiz, list) else 0
                invalid = total - len(sanitized_quiz)
                print(f"[QUIZ] Attempt {attempt}: {len(sanitized_quiz)} valid, {invalid} invalid")

                if sanitized_quiz:
                    issues = self._validate_quiz(sanitized_quiz, clamped, question_type)
                    if issues:
                        print(f"[STUDY_AI_VALIDATION] quiz attempt={attempt} FAIL: {issues}")
                        if attempt < 2:
                            print("[STUDY_AI_RETRY] quiz retrying due to validation failure")
                            continue
                        else:
                            print("[STUDY_AI_VALIDATION] quiz using best-effort result after retry")
                    else:
                        print(f"[STUDY_AI_VALIDATION] quiz attempt={attempt} PASS: {len(sanitized_quiz)} questions OK")
                    break
                print(f"[QUIZ] Attempt {attempt}: 0 valid — retrying…")
            except ValueError as exc:
                print(f"[QUIZ] Attempt {attempt} parse failure: {exc}")

        if not sanitized_quiz:
            print("[QUIZ] All attempts failed")
            return {
                "status": "error",
                "message": "Failed to parse LLM JSON output after retry",
                "raw_output": self.clean_markdown_fences(raw_output),
            }

        # Trim to requested count if LLM over-generated
        sanitized_quiz = sanitized_quiz[:clamped]
        print(f"[QUIZ] Final questions returned: {len(sanitized_quiz)}")
        return {
            "status": "success",
            "material_id": material_id,
            "quiz": sanitized_quiz,
        }

    def generate_material_flashcards(
        self,
        class_id: int,
        material_id: int,
        num_cards: int = 10,
        focus: str = "mixed",
        include_examples: bool = False,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        print(f"[FLASHCARDS] class_id={class_id} material_id={material_id}")
        print(f"[STUDY_AI_OPTIONS] flashcards  class_id={class_id}  material_id={material_id}  "
              f"num_cards={num_cards}  focus={focus!r}  include_examples={include_examples}  "
              f"force_refresh={force_refresh}")
        if force_refresh:
            print(f"[STUDY_CACHE] bypass forceRefresh=true tool=flashcards material_id={material_id}")
        chunks = self.get_material_chunks(class_id, material_id)
        if not chunks:
            return {"status": "error", "message": "Material not indexed"}

        clamped_cards = max(1, min(30, int(num_cards)))
        context = self.build_material_context(chunks, max_chars=6000)
        print(f"[FLASHCARDS] Chunks count: {len(chunks)}  Context length: {len(context)}")

        sanitized_flashcards: list[dict] = []
        raw_output = ""

        for attempt in range(1, 3):
            retry_hint: str | None = None
            if attempt > 1:
                retry_hint = (
                    "IMPORTANT: Your previous output failed validation. "
                    f"You MUST return EXACTLY {clamped_cards} flashcards. "
                    f"Every card MUST have focus_type={focus!r}. "
                    "Return ONLY valid JSON array. No text outside the array."
                )
            raw_output = self.qwen_service.generate_flashcards(
                context, clamped_cards,
                focus=focus,
                include_examples=include_examples,
                retry_prompt=retry_hint,
            ) or ""
            print(f"[FLASHCARDS] Attempt {attempt} raw preview: {raw_output[:200]}")

            try:
                parsed_flashcards = self.parse_llm_json_output(raw_output)
                sanitized_flashcards = self._sanitize_flashcards(parsed_flashcards, focus=focus)
                print(f"[FLASHCARDS] Attempt {attempt}: {len(sanitized_flashcards)} valid cards")

                if sanitized_flashcards:
                    issues = self._validate_flashcards(sanitized_flashcards, clamped_cards, focus)
                    if issues:
                        print(f"[STUDY_AI_VALIDATION] flashcards attempt={attempt} FAIL: {issues}")
                        if attempt < 2:
                            print("[STUDY_AI_RETRY] flashcards retrying due to validation failure")
                            continue
                        else:
                            print("[STUDY_AI_VALIDATION] flashcards using best-effort result after retry")
                    else:
                        print(f"[STUDY_AI_VALIDATION] flashcards attempt={attempt} PASS: {len(sanitized_flashcards)} cards OK")
                    break
                print(f"[FLASHCARDS] Attempt {attempt}: 0 valid — retrying…")
            except ValueError:
                print(f"[FLASHCARDS] Attempt {attempt} parse failure")

        if not sanitized_flashcards:
            return {
                "status": "error",
                "message": "Failed to parse LLM JSON output",
                "raw_output": self.clean_markdown_fences(raw_output),
            }

        # Trim to requested count
        sanitized_flashcards = sanitized_flashcards[:clamped_cards]
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

        question_id = question.get("question_id")

        def _is_truthy(value: Any) -> bool:
            if isinstance(value, bool):
                return value
            if isinstance(value, (int, float)):
                return value == 1
            if isinstance(value, str):
                return value.strip().lower() in {"1", "true", "yes"}
            return False

        def _parse_ai_metadata(raw_metadata: Any) -> dict[str, Any]:
            if isinstance(raw_metadata, dict):
                return raw_metadata
            if isinstance(raw_metadata, str) and raw_metadata.strip():
                try:
                    parsed = json.loads(raw_metadata)
                    if isinstance(parsed, dict):
                        return parsed
                except json.JSONDecodeError:
                    print(f"[QA_INDEX] question_id={question_id} invalid ai_metadata JSON")
            return {}

        doctor_answer = next((a for a in answers if a.get("doctor_id") is not None), None)
        if doctor_answer is not None:
            top_answer = doctor_answer
            print(f"[QA_INDEX] indexed doctor answer question_id={question_id} answer_id={top_answer.get('answer_id')}")
        else:
            eligible_ai_answer = None
            saw_unvalidated_ai = False
            saw_student_answer = False

            for answer in answers:
                is_ai_generated = _is_truthy(answer.get("is_ai_generated"))
                if is_ai_generated:
                    metadata = _parse_ai_metadata(answer.get("ai_metadata"))
                    confidence_raw = answer.get("confidence")
                    try:
                        confidence = float(confidence_raw)
                    except (TypeError, ValueError):
                        confidence = 0.0
                    is_validated = _is_truthy(metadata.get("validated"))
                    if is_validated or confidence >= 0.90:
                        eligible_ai_answer = answer
                        print(
                            f"[QA_INDEX] indexed high-confidence AI answer question_id={question_id} "
                            f"answer_id={answer.get('answer_id')} confidence={confidence:.2f} validated={is_validated}"
                        )
                        break
                    saw_unvalidated_ai = True
                    continue

                saw_student_answer = True

            if eligible_ai_answer is None:
                if saw_unvalidated_ai:
                    print(f"[QA_INDEX] skipped unvalidated AI answer question_id={question_id}")
                if saw_student_answer:
                    print(f"[QA_INDEX] skipped student answer question_id={question_id}")
                return None

            top_answer = eligible_ai_answer

        answer_text = (
            top_answer.get("answer_text") or top_answer.get("text") or ""
        ).strip()
        question_text = (
            question.get("question_text") or question.get("text") or ""
        ).strip()

        if not answer_text:
            print(f"[INDEX] question_id={question.get('question_id')} skipped: answer_text empty. answer keys={list(top_answer.keys())}")
            return None
        if not question_text:
            print(f"[INDEX] question_id={question.get('question_id')} skipped: question_text empty. question keys={list(question.keys())}")
            return None

        asked_by_id = question.get("user_id") or question.get("doctor_id")
        answered_by_id = top_answer.get("doctor_id") or top_answer.get("user_id")

        return {
            "question_id":      int(question["question_id"]),
            "class_id":         int(question["class_id"]),
            "question_text":    question_text,
            "answer_id":        top_answer.get("answer_id"),
            "answer_text":      answer_text,
            # asker metadata
            "asked_by_id":      str(asked_by_id) if asked_by_id is not None else "",
            "asked_by_name":    str(question.get("asked_by_name") or "").strip(),
            "asked_by_role":    str(question.get("asked_by_role") or "student"),
            "asked_at":         str(question.get("time") or question.get("asked_at") or ""),
            # answerer metadata
            "answered_by_id":   str(answered_by_id) if answered_by_id is not None else "",
            "answered_by_name": str(top_answer.get("answered_by_name") or "").strip(),
            "answered_by_role": str(top_answer.get("answered_by_role") or (
                "doctor" if top_answer.get("doctor_id") is not None else "student"
            )),
            "answered_at":      str(top_answer.get("answer_time") or top_answer.get("answered_at") or ""),
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
            try:
                resolved_file, downloaded = self._resolve_material_file_with_meta(material)
            except Exception as exc:
                print(f"[PDF] File resolution/download failed for material {material_id}: {exc}")
                print(f"[PDF] Falling back to available text/summarize fields.")
                resolved_file, downloaded = None, False

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

        # Temporary debug logs requested by the user during indexing
        print("[INDEX]")
        print(f"material_id: {material_id}")
        print(f"material name: {material_name}")
        print(f"material type: {material_type}")
        print(f"text length: {len(selected_text)}")
        print(f"number of chunks created: {len(chunk_records)}")
        print(f"embedding dimension: {len(vectors[0]) if vectors else 0}")

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
        self, pages: list[dict], chunk_size: int = 500, overlap: int = 100
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
        try:
            response = requests.get(url, timeout=120)
            response.raise_for_status()
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "unknown"
            raise RuntimeError(
                f"[PDF] HTTP {status} downloading {url}"
            ) from exc
        except requests.exceptions.ConnectionError as exc:
            raise RuntimeError(
                f"[PDF] Connection error downloading {url}: {exc}"
            ) from exc
        except requests.exceptions.Timeout:
            raise RuntimeError(
                f"[PDF] Timeout (120s) downloading {url}"
            ) from None

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
        self, text: str, chunk_size: int = 500, overlap: int = 100
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
        """
        Multi-stage JSON parser with repair pipeline.

        Stages:
          1. Strip fences, control chars, smart quotes
          2. Extract the largest JSON array/object via depth-tracking
          3. json.loads on the raw candidate
          4. LaTeX-escape repair  → json.loads
          5. Auto-close truncated arrays → json.loads
          6. Regex fallback to grab largest [...] block → json.loads
          7. literal_eval last resort
          8. Raise ValueError with a summary of every attempt
        """
        # ── stage 1: pre-process ─────────────────────────────────────────────
        cleaned = self.clean_markdown_fences(raw)
        cleaned = self._strip_control_chars(cleaned)
        cleaned = self._normalize_smart_quotes(cleaned)
        cleaned = re.sub(r",(\s*[\]}])", r"\1", cleaned)   # trailing commas

        print(f"[LLM_JSON] Pre-processed preview: {cleaned[:200]!r}")

        # ── stage 2: extract candidate ───────────────────────────────────────
        candidate = self._extract_json_candidate(cleaned)
        if not candidate:
            raise ValueError("No JSON array/object found in LLM output")

        print(f"[LLM_JSON] Candidate ({len(candidate)} chars) preview: {candidate[:160]!r}")

        # ── stage 3: direct parse ────────────────────────────────────────────
        try:
            result = json.loads(candidate)
            print("[LLM_JSON] Stage 3 (direct) succeeded")
            return result
        except json.JSONDecodeError as exc:
            print(f"[LLM_JSON] Stage 3 (direct) failed: {exc}")

        # ── stage 4: LaTeX-escape repair ─────────────────────────────────────
        repaired = self._repair_json_latex_escapes(candidate)
        if repaired != candidate:
            try:
                result = json.loads(repaired)
                print("[LLM_JSON] Stage 4 (LaTeX repair) succeeded")
                return result
            except json.JSONDecodeError as exc:
                print(f"[LLM_JSON] Stage 4 (LaTeX repair) failed: {exc}")
        else:
            print("[LLM_JSON] Stage 4 skipped — no LaTeX repair needed")
            repaired = candidate

        # ── stage 5: auto-close truncated array ──────────────────────────────
        closed = self._auto_close_json(repaired)
        if closed != repaired:
            try:
                result = json.loads(closed)
                print("[LLM_JSON] Stage 5 (auto-close) succeeded")
                return result
            except json.JSONDecodeError as exc:
                print(f"[LLM_JSON] Stage 5 (auto-close) failed: {exc}")

        # ── stage 6: regex fallback ───────────────────────────────────────────
        regex_candidate = self._regex_extract_array(cleaned)
        if regex_candidate and regex_candidate != candidate:
            regex_repaired = self._repair_json_latex_escapes(regex_candidate)
            for attempt_label, attempt_text in (
                ("regex-raw",      regex_candidate),
                ("regex-repaired", regex_repaired),
                ("regex-closed",   self._auto_close_json(regex_repaired)),
            ):
                try:
                    result = json.loads(attempt_text)
                    print(f"[LLM_JSON] Stage 6 ({attempt_label}) succeeded")
                    return result
                except json.JSONDecodeError as exc:
                    print(f"[LLM_JSON] Stage 6 ({attempt_label}) failed: {exc}")

        # ── stage 7: literal_eval last resort ────────────────────────────────
        literal_candidate = self._normalize_json_like_literal(repaired)
        try:
            parsed = ast.literal_eval(literal_candidate)
            if isinstance(parsed, (list, dict)):
                print("[LLM_JSON] Stage 7 (literal_eval) succeeded")
                return parsed
            print("[LLM_JSON] Stage 7 (literal_eval) returned unsupported type")
        except (ValueError, SyntaxError) as exc:
            print(f"[LLM_JSON] Stage 7 (literal_eval) failed: {exc}")

        raise ValueError("All JSON parse stages failed for LLM output")

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

    # ── JSON pre-processing helpers ───────────────────────────────────────────

    def _strip_control_chars(self, text: str) -> str:
        """Remove ASCII control chars except tab/newline/CR that break JSON parsers."""
        return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    def _normalize_smart_quotes(self, text: str) -> str:
        """Replace Unicode curly/smart quotes with straight ASCII equivalents."""
        return (
            text
            .replace("“", '"').replace("”", '"')   # " "
            .replace("‘", "'").replace("’", "'")   # ' '
            .replace("«", '"').replace("»", '"')   # « »
        )

    def _extract_json_candidate(self, text: str) -> str:
        """
        Return the largest JSON array (preferred) or object found in *text*.
        Uses bracket-depth tracking so it handles nested structures correctly
        and is not confused by trailing prose after the closing bracket.
        """
        candidate = (text or "").strip()
        if not candidate:
            return ""

        # Prefer arrays first (quiz / flashcard output), then objects.
        for opener, closer in (("[", "]"), ("{", "}")):
            start = candidate.find(opener)
            if start == -1:
                continue
            depth = 0
            in_string = False
            escape_next = False
            best_end = -1
            for i in range(start, len(candidate)):
                ch = candidate[i]
                if escape_next:
                    escape_next = False
                    continue
                if ch == "\\" and in_string:
                    escape_next = True
                    continue
                if ch == '"':
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if ch == opener:
                    depth += 1
                elif ch == closer:
                    depth -= 1
                    if depth == 0:
                        best_end = i
                        break
            if best_end != -1:
                return candidate[start : best_end + 1].strip()

        return ""

    def _auto_close_json(self, text: str) -> str:
        """
        If the model output was truncated mid-array, append the missing closing
        brackets so the parser has a chance to recover partial data.
        """
        s = text.strip()
        if not s:
            return s
        # Remove a trailing incomplete string value (unclosed quote)
        if s.count('"') % 2 != 0:
            last_quote = s.rfind('"')
            s = s[:last_quote].rstrip(",").rstrip()

        # Remove dangling comma before we close
        s = re.sub(r",\s*$", "", s)

        # Close any open object then close array
        open_braces  = s.count("{") - s.count("}")
        open_brackets = s.count("[") - s.count("]")
        if open_braces > 0:
            s += "}" * open_braces
        if open_brackets > 0:
            s += "]" * open_brackets
        return s

    def _regex_extract_array(self, text: str) -> str:
        """
        Last-resort: use regex to grab the longest [...] block, even if the
        bracket-depth walker failed (e.g. due to unmatched brackets in prose).
        """
        matches = re.findall(r"\[.*?\]", text, flags=re.DOTALL)
        if not matches:
            return ""
        # Return the longest match — most likely the real array
        return max(matches, key=len)

    def _repair_json_latex_escapes(self, text: str) -> str:
        repaired = text

        # Escape common LaTeX delimiters inside JSON strings.
        for latex_token in (r"\(", r"\)", r"\[", r"\]"):
            repaired = repaired.replace(latex_token, latex_token.replace("\\", "\\\\"))

        # Escape single backslashes that are not valid JSON escapes.
        repaired = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r"\\\\", repaired)

        # Remove trailing commas that frequently appear in model-produced JSON.
        repaired = re.sub(r",(\s*[\]}])", r"\1", repaired)

        # Fix unescaped literal newlines inside string values
        def _fix_newlines_in_strings(m: re.Match) -> str:
            return m.group(0).replace("\n", "\\n").replace("\r", "\\r")

        repaired = re.sub(r'"(?:[^"\\]|\\.)*"', _fix_newlines_in_strings, repaired)

        return repaired

    def _normalize_json_like_literal(self, text: str) -> str:
        normalized = text.strip()
        normalized = re.sub(r"\bnull\b", "None", normalized)
        normalized = re.sub(r"\btrue\b", "True", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\bfalse\b", "False", normalized, flags=re.IGNORECASE)
        return normalized

    def _sanitize_quiz_items(self, parsed: Any) -> list[dict[str, Any]]:
        if isinstance(parsed, dict):
            parsed = parsed.get("questions", [])
        if not isinstance(parsed, list):
            return []

        cleaned_items = []
        for idx, item in enumerate(parsed):
            if not isinstance(item, dict):
                print(f"[QUIZ] Item {idx}: skipped (not a dict)")
                continue

            question = self.clean_ai_text(str(item.get("question") or ""), plain_text=True)
            if not question:
                print(f"[QUIZ] Item {idx}: skipped (empty question)")
                continue

            options = item.get("options")
            if not isinstance(options, list):
                print(f"[QUIZ] Item {idx}: skipped (options not a list)")
                continue

            # Detect item type from the 'type' field or fall back to option count
            item_type = str(item.get("type") or "").strip().lower()
            if not item_type:
                item_type = "true_false" if len(options) == 2 else "mcq"

            # Validate option count matches expected type
            if item_type == "true_false":
                if len(options) not in (2, 4):  # allow degraded MCQ mistakenly labelled TF
                    # Force true/false options if model only gave 2
                    pass
                # Normalise to exactly 2 options
                if len(options) >= 2:
                    options = options[:2]
                else:
                    print(f"[QUIZ] Item {idx}: skipped (true_false needs ≥2 options)")
                    continue
                valid_answers = {"A", "B"}
            else:
                item_type = "mcq"
                if len(options) != 4:
                    print(f"[QUIZ] Item {idx}: skipped (mcq needs 4 options, got {len(options)})")
                    continue
                valid_answers = {"A", "B", "C", "D"}

            clean_options = [
                self.clean_ai_text(str(opt or ""), plain_text=True) for opt in options
            ]
            if not all(clean_options):
                print(f"[QUIZ] Item {idx}: skipped (empty option text)")
                continue

            answer = self._normalize_answer_letter(item.get("answer"), clean_options)
            if answer not in valid_answers:
                print(f"[QUIZ] Item {idx}: skipped (answer {answer!r} not in {valid_answers})")
                continue

            explanation = self.clean_ai_text(
                str(item.get("explanation") or ""), plain_text=True
            )
            # Fallback: generate a minimal explanation if the LLM omitted it
            if not explanation and clean_options and answer:
                answer_idx = {"A": 0, "B": 1, "C": 2, "D": 3}.get(answer, -1)
                correct_text = clean_options[answer_idx] if 0 <= answer_idx < len(clean_options) else answer
                explanation = f"The correct answer is **{answer}**: {correct_text}."

            # Preserve difficulty field (default to question_type difficulty or "mixed")
            item_difficulty = str(item.get("difficulty") or "").strip().lower()
            if item_difficulty not in ("easy", "medium", "hard"):
                item_difficulty = "mixed"

            cleaned_items.append({
                "type":        item_type,
                "difficulty":  item_difficulty,
                "question":    question,
                "options":     clean_options,
                "answer":      answer,
                "explanation": explanation,
            })

        return cleaned_items

    # ── Flashcard LaTeX helpers ───────────────────────────────────────────────

    _MATH_SEGMENT_RE = re.compile(r'\$\$[\s\S]*?\$\$|\$[^$\n]*?\$')

    @staticmethod
    def _count_braces(text: str) -> tuple[int, int]:
        """Return (open_count, close_count) of unescaped braces."""
        opens = len(re.findall(r'(?<!\\)\{', text))
        closes = len(re.findall(r'(?<!\\)\}', text))
        return opens, closes

    @staticmethod
    def _validate_formula(formula: str) -> list[str]:
        """Return list of detected problems in a LaTeX formula string."""
        issues: list[str] = []
        opens, closes = RagService._count_braces(formula)
        if opens != closes:
            issues.append(f"unbalanced braces ({opens} open, {closes} close)")
        # \frac must be followed by {arg}{arg}
        for m in re.finditer(r'\\frac', formula):
            after = formula[m.end():]
            if not re.match(r'\s*\{[^}]*\}\s*\{[^}]*\}', after):
                issues.append(r"\frac missing one or both brace arguments")
                break
        # Unclosed $ inside the formula (shouldn't happen but guard anyway)
        if formula.count('$') % 2 != 0:
            issues.append("odd number of $ delimiters inside formula")
        return issues

    def _validate_and_log_flashcard_latex(self, field: str, text: str, idx: int) -> None:
        """Log any LaTeX issues found in a flashcard field."""
        for m in self._MATH_SEGMENT_RE.finditer(text):
            formula = m.group(0)
            issues = self._validate_formula(formula)
            if issues:
                print(
                    f"[FLASHCARD_LATEX] card={idx} field={field} "
                    f"formula={formula!r:.120} issues={issues}"
                )
            else:
                print(
                    f"[FLASHCARD_LATEX] card={idx} field={field} "
                    f"formula OK: {formula!r:.80}"
                )

    _VALID_FOCUS_TYPES = {"key_terms", "definitions", "formulas", "mixed"}

    def _sanitize_flashcards(
        self, parsed: Any, focus: str = "mixed"
    ) -> list[dict[str, Any]]:
        if not isinstance(parsed, list):
            return []

        cleaned_items = []
        for idx, item in enumerate(parsed):
            if not isinstance(item, dict):
                continue

            # Accept both old schema (term/definition) and new schema (front/back)
            # Do NOT pass plain_text=True — that collapses whitespace and strips $formula$ delimiters
            front = self.clean_ai_text(str(item.get("front") or item.get("term") or ""))
            back  = self.clean_ai_text(str(item.get("back")  or item.get("definition") or ""))
            if not front or not back:
                print(f"[FLASHCARDS] card={idx}: skipped (empty front or back)")
                continue

            example_raw = item.get("example")
            if example_raw and str(example_raw).strip() not in ("", "null", "None"):
                example: str | None = self.clean_ai_text(str(example_raw))
            else:
                example = None

            # Preserve focus_type — fall back to the requested focus
            raw_focus_type = str(item.get("focus_type") or "").strip().lower()
            focus_type = raw_focus_type if raw_focus_type in self._VALID_FOCUS_TYPES else focus

            # Validate and log LaTeX in each field
            self._validate_and_log_flashcard_latex("front",   front,   idx)
            self._validate_and_log_flashcard_latex("back",    back,    idx)
            if example:
                self._validate_and_log_flashcard_latex("example", example, idx)

            cleaned_items.append({
                "focus_type": focus_type,
                "front":      front,
                "back":       back,
                "example":    example,
            })

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
