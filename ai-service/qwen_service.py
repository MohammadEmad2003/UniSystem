from __future__ import annotations

import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = (
    "You are an academic assistant for a university class.\n"
    "Answer ONLY using the provided class context.\n"
    "If the context is not enough, return exactly: SEND_TO_DOCTOR\n"
    "Do not hallucinate.\n"
    "Keep the answer clear and student-friendly.\n"
    "If the context includes page numbers, end the answer with a short citation in this exact format: (Source: page X).\n"
    "Do not invent citations or page numbers."
)


class QwenService:
    def __init__(self) -> None:
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
        self.model = os.getenv("QWEN_MODEL", "qwen2.5:1.5b-instruct").strip()
        print("🔥 USING LOCAL OLLAMA MODEL")

    def rewrite_question(self, question: str) -> str | None:
        print("✍️ USING OLLAMA FOR QUERY REWRITE")
        prompt = (
            "Rewrite the student question into a concise academic search query. "
            "Do not answer it.\n"
            "Return plain text only.\n"
            "Keep it short.\n"
            "Do not add unrelated concepts.\n"
            "Preserve the original meaning.\n\n"
            f"Student question:\n{question}"
        )
        return self._generate_text(prompt, "query rewrite")

    def summarize_pdf_chunk(self, text: str) -> str | None:
        prompt = (
            "Summarize this PDF chunk into important bullet points. "
            "Use only the provided text. Do not add outside information.\n\n"
            f"PDF chunk:\n{text}"
        )
        return self._generate_text(prompt, "pdf chunk summarization")

    def summarize_material(self, text: str) -> str | None:
        prompt = (
            "Summarize this PDF material into short bullet points covering the main ideas. "
            "Use only the provided text. Do not add outside information.\n\n"
            f"PDF material:\n{text}"
        )
        return self._generate_text(prompt, "material summarization")

    def generate_material_summary(
        self, context: str, mode: str = "simple"
    ) -> str | None:
        mode_instruction = {
            "exam": "Focus on key points for revision and exam preparation.",
            "simple": "Explain the ideas in simple language that is easy for students to study.",
            "detailed": "Include a bit more explanation while staying concise and structured.",
        }.get(mode, "Explain the ideas in simple language that is easy for students to study.")

        prompt = (
            "Summarize the material in clean bullet points.\n\n"
            "Rules:\n"
            "* NO intro text\n"
            "* NO repetition\n"
            "* Max 4 sections\n"
            "* Bullet points only\n"
            "* Keep it short and readable\n"
            "* Do NOT use code blocks\n"
            "* Do NOT return JSON\n"
            "* Use ONLY the provided text\n"
            f"* {mode_instruction}\n\n"
            f"Text:\n{context}"
        )
        return self._generate_text(prompt, "material summary generation")

    def summarize_page(self, page_text: str) -> str | None:
        prompt = (
            "Summarize this page into 3-5 clear bullet points.\n"
            "Use only the provided text.\n"
            "Do not add outside information.\n\n"
            "Return clean Markdown only.\n"
            "Use bullet points only.\n"
            "Do not return JSON.\n"
            "Do not wrap the output in code fences.\n\n"
            f"Page text:\n{page_text}"
        )
        return self._generate_text(prompt, "page summary generation")

    def generate_study_notes(self, context: str) -> str | None:
        prompt = (
            "You are a university assistant.\n\n"
            "Create clean and concise study notes.\n\n"
            "Rules:\n\n"
            '* NO introductions (do not say "Certainly", "Here is", etc.)\n'
            "* NO repetition\n"
            "* Use this structure ONLY:\n\n"
            "## Key Idea\n\n"
            "* short bullet points\n\n"
            "## Definition\n\n"
            "* simple explanation\n"
            "* include formula in simple format\n\n"
            "## Properties\n\n"
            "* bullet points only\n\n"
            "## Important Notes\n\n"
            "* short bullets\n\n"
            "* Use short lines\n"
            "* Avoid long paragraphs\n"
            "* Avoid complex LaTeX, use simple math\n"
            "* Do NOT use markdown code blocks\n"
            "* Do NOT return JSON\n\n"
            f"Material:\n{context}"
        )
        return self._generate_text(prompt, "study notes generation")

    def generate_quiz(self, context: str, num_questions: int) -> str | None:
        prompt = (
            f"Generate {num_questions} multiple-choice quiz questions from the material.\n\n"
            "Rules:\n\n"
            "* Use only the provided material.\n"
            "* Do not add external information.\n"
            "* Each question must have exactly 4 options.\n"
            "* Include the correct answer.\n"
            "* Return ONLY a valid JSON array.\n"
            "* Do not wrap the JSON in markdown.\n"
            "* Do not use ```json.\n"
            "* Do not add explanation before or after the JSON.\n"
            "* JSON format:\n"
            "  [\n"
            '  {\n  "question": "...",\n  "options": ["A", "B", "C", "D"],\n  "answer": "..."\n  }\n'
            "  ]\n\n"
            f"Material:\n{context}"
        )
        return self._generate_text(prompt, "quiz generation")

    def generate_flashcards(self, context: str, num_cards: int) -> str | None:
        prompt = (
            f"Create {num_cards} flashcards from this material.\n\n"
            "Rules:\n\n"
            "* Use only the provided material.\n"
            "* Do not add external information.\n"
            "* Focus on key terms, definitions, formulas, and concepts.\n"
            "* Return ONLY a valid JSON array.\n"
            "* Do not wrap the JSON in markdown.\n"
            "* Do not use ```json.\n"
            "* Do not add explanation before or after the JSON.\n"
            "* Avoid LaTeX backslash commands; write formulas in plain text when possible.\n"
            "* JSON format:\n"
            "  [\n"
            '  {\n  "term": "...",\n  "definition": "..."\n  }\n'
            "  ]\n\n"
            f"Material:\n{context}"
        )
        return self._generate_text(prompt, "flashcards generation")

    def generate_answer(self, context: str, question: str) -> str | None:
        print("🔥 USING OLLAMA FOR ANSWER GENERATION")
        print("Answer context length:", len(context or ""))
        print("Answer question:", question)
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"Class context:\n{context}\n\n"
            f"Student question:\n{question}\n\n"
            "Return only the final answer.\n"
            "Return clean Markdown only.\n"
            "Do not wrap the output in code fences.\n"
            "Do not return JSON."
        )

        answer = self._generate_text(prompt, "answer generation")
        if answer:
            preview = answer[:160] + ("..." if len(answer) > 160 else "")
            print(f"[OLLAMA] Generated answer preview: {preview}")
        return answer

    def answer_question(
        self, question: str, context_items: list[dict[str, Any]]
    ) -> dict[str, Any]:
        context_blocks = []
        material_summaries_added: set[Any] = set()

        for index, item in enumerate(context_items, start=1):
            source_line = f"[{index}] Source: {item['source_name']}"
            if item.get("page_number") is not None:
                source_line += f" | Page {item['page_number']}"

            context_block = f"{source_line}\n{item['chunk_text']}"

            if item.get("summary"):
                context_block += f"\nChunk summary:\n{item['summary']}"

            material_id = item.get("material_id")
            material_summary = item.get("material_summary")
            if material_summary and material_id not in material_summaries_added:
                context_block += f"\nMaterial summary:\n{material_summary}"
                material_summaries_added.add(material_id)

            context_blocks.append(context_block)

        raw_answer = self.generate_answer(
            context="\n\n".join(context_blocks),
            question=question,
        )

        if raw_answer is None:
            return {
                "decision": "sent_to_doctor",
                "answer": "",
                "confidence": 0.0,
            }

        normalized_answer = raw_answer.strip()
        normalized_answer = normalized_answer.removeprefix("```json").removeprefix("```markdown")
        normalized_answer = normalized_answer.removeprefix("```").removesuffix("```").strip()
        if normalized_answer.upper() == "SEND_TO_DOCTOR":
            return {
                "decision": "sent_to_doctor",
                "answer": "",
                "confidence": 0.0,
            }

        return {
            "decision": "answered",
            "answer": normalized_answer,
            "confidence": 0.7,
        }

    def _generate_text(self, prompt: str, operation_name: str) -> str | None:
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                },
                timeout=120,
            )
            response.raise_for_status()
            return response.json().get("response", "").strip() or None
        except requests.RequestException as exc:
            error_body = ""
            if exc.response is not None:
                error_body = exc.response.text
            print(f"[OLLAMA] {operation_name} failed: {exc}")
            if error_body:
                print(f"[OLLAMA] Response body: {error_body}")
            return None
        except Exception as exc:
            print(f"[OLLAMA] Unexpected {operation_name} error: {exc}")
            return None
