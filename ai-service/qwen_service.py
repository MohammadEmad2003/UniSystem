from __future__ import annotations

import os
import re
import time
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Ollama config ──────────────────────────────────────────────────────────────
_OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://localhost:11434").rstrip("/")
_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", os.getenv("QWEN_MODEL", "qwen2.5:7b-instruct")).strip()

# ── Shared LaTeX rules injected into every prompt ──────────────────────────────
# Keep in sync with aiMathSanitizer.ts on the frontend.
MATH_RULES = (
    "=== MATH / LATEX RULES (MANDATORY) ===\n"
    "- Write ALL mathematics using KaTeX-compatible LaTeX delimiters:\n"
    "    inline:  $...$\n"
    "    display: $$...$$\n"
    "- NEVER use \\begin{equation}, \\begin{align}, \\begin{equation*}, \\[ ... \\], or \\( ... \\).\n"
    "- NEVER output a formula without delimiters (e.g. write $D_k$ not just D_k).\n"
    "- Every \\frac MUST have both arguments: \\frac{numerator}{denominator}.\n"
    "  NEVER write \\frac{}{} or \\frac{}.\n"
    "- Every { MUST have a matching }. Check brace balance before outputting.\n"
    "- NEVER remove backslashes from LaTeX commands (\\theta, \\omega, \\frac, \\sum, \\int).\n"
    "- If you are unsure how to write a formula correctly, explain it in plain words instead.\n"
    "- Do NOT write raw OCR artifacts: use \\theta not heta, T_0 not T_o, D_k not Dk, \\omega_0 not w0.\n"
    "- NEVER output bare backslash math outside delimiters (e.g. WRONG: \\omega_0 = ...  RIGHT: $\\omega_0 = ...$).\n"
    "- NEVER output a lone $ or unmatched $$. Every opening delimiter must be closed.\n"
)

# ── Flashcard / quiz specific math rules — prefer plain English over LaTeX ───
FLASHCARD_MATH_RULES = (
    "=== MATH RULES FOR FLASHCARDS (STRICT) ===\n"
    "- Prefer plain readable English over LaTeX formulas.\n"
    "- Express simple relationships in words:\n"
    "    GOOD: 'fundamental frequency = 1 divided by the period'\n"
    "    BAD:  '$f_0 = \\\\frac{1}{T_0}$'\n"
    "- Greek letters: write the word (omega, pi, theta) or use the Unicode symbol (ω, π, θ).\n"
    "    GOOD: 'angular frequency ω₀'   BAD: '$\\\\omega_0$'\n"
    "- Subscripts: use plain text subscript notation or words:\n"
    "    GOOD: 'coefficient Dₖ'         BAD: '$D_k$'\n"
    "    GOOD: 'period T₀'              BAD: '$T_0$'\n"
    "- Short simple formulas ONLY if unavoidable — wrap in $...$:\n"
    "    GOOD: '$f = 1/T$'              BAD: '$f_0 = \\\\frac{1}{T_0}\\\\sum_{k=-\\\\infty}^{\\\\infty}$'\n"
    "- NEVER put a complex multi-term formula on a flashcard front or back.\n"
    "- If a formula is too complex to write cleanly, write: 'See the notes section for the full formula.'\n"
    "- front field: MUST be short (term name, concept, or simple question). NO equations.\n"
    "- back field: plain English definition or explanation. Simple $...$  notation only if necessary.\n"
)

QUIZ_MATH_RULES = (
    "=== MATH RULES FOR QUIZ OPTIONS (STRICT) ===\n"
    "- Question stems may include properly wrapped math: $...$ or $$...$$.\n"
    "- Answer OPTIONS must be SHORT and READABLE (under 60 characters each).\n"
    "- Prefer plain English options: 'It doubles the frequency' over a formula.\n"
    "- If an option must contain math, use simple inline $...$  notation only.\n"
    "- NEVER put a multi-term integral, sum, or matrix inside an answer option.\n"
    "- Explanations may use simple $...$ math if clearly wrapped.\n"
    "- NEVER output raw backslash math outside delimiters in any field.\n"
)

# ── System prompts ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are an academic assistant for a university class.\n"
    "Answer ONLY using the provided class context.\n"
    "If the context is not enough, return exactly: SEND_TO_DOCTOR\n"
    "Do not hallucinate.\n"
    "Keep the answer clear and student-friendly.\n"
    "\n" + MATH_RULES + "\n"
    "If the context includes page numbers, end the answer with a short citation "
    "in this exact format: (Source: page X).\n"
    "Do not invent citations or page numbers."
)

# Dedicated system prompt for RAG question answering — prioritises math clarity
QA_SYSTEM_PROMPT = (
    "You are a Signals & Systems teaching assistant helping university students.\n\n"
    "Rules you MUST follow:\n"
    "- Answer ONLY using the provided class context. Do not hallucinate.\n"
    "- If the context is insufficient, return exactly: SEND_TO_DOCTOR\n"
    "- Write in clean Markdown. Use bullet points for lists.\n"
    "- Preserve every equation from the context exactly.\n"
    "- Use **bold** for key terms and definitions.\n"
    "- Keep the answer concise and student-friendly.\n"
    "- If the context includes page numbers, cite as: (Source: page X).\n"
    "- Do NOT wrap the whole answer in ``` code fences.\n"
    "- Do NOT return JSON.\n"
    "\n" + MATH_RULES
)

GENERAL_SYSTEM_PROMPT = (
    "You are a helpful university academic assistant.\n"
    "Answer student questions clearly, concisely, and helpfully.\n"
    "You can help with academic topics, study advice, or general university questions.\n"
    "Keep answers student-friendly and well-structured.\n"
    "Do not hallucinate facts. If you are unsure, say so."
)


class QwenService:
    def __init__(self) -> None:
        print(f"[qwen_service] Using Ollama LLM")
        print(f"[qwen_service] Model : {_OLLAMA_MODEL}")
        print(f"[qwen_service] URL   : {_OLLAMA_URL}")

    # ── Core Ollama call ───────────────────────────────────────────────────────

    def _call_ollama(
        self,
        operation: str,
        system: str,
        user_prompt: str,
        timeout: int = 120,
        num_predict: int = 2048,
        temperature: float | None = None,
        top_p: float | None = None,
        repeat_penalty: float | None = None,
    ) -> str | None:
        """POST to Ollama /api/chat and return the assistant reply text, or None."""
        t0 = time.time()
        options: dict = {"num_predict": num_predict}
        if temperature is not None:
            options["temperature"] = temperature
        if top_p is not None:
            options["top_p"] = top_p
        if repeat_penalty is not None:
            options["repeat_penalty"] = repeat_penalty
        try:
            resp = requests.post(
                f"{_OLLAMA_URL}/api/chat",
                json={
                    "model": _OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "stream": False,
                    "options": options,
                },
                timeout=timeout,
            )
            resp.raise_for_status()
            text = (resp.json().get("message") or {}).get("content", "").strip()
            print(f"[OLLAMA] {operation} done in {round(time.time()-t0,2)}s")
            return text or None
        except requests.ConnectionError:
            print(f"[OLLAMA] {operation} — cannot connect to {_OLLAMA_URL}. Is Ollama running?")
            return None
        except requests.Timeout:
            print(f"[OLLAMA] {operation} — timed out after {timeout}s")
            return None
        except requests.HTTPError as exc:
            print(f"[OLLAMA] {operation} — HTTP {exc.response.status_code}: {exc.response.text[:200]}")
            return None
        except Exception as exc:
            print(f"[OLLAMA] {operation} — unexpected error: {exc}")
            return None

    # ── kept for backward-compat callers in rag_service ───────────────────────

    def _generate_text(
        self, prompt: str, operation_name: str, system: str | None = None
    ) -> str | None:
        return self._call_ollama(
            operation_name,
            system if system is not None else SYSTEM_PROMPT,
            prompt,
        )

    # ── Public methods ─────────────────────────────────────────────────────────

    # Academic terms that must NOT appear in a rewrite if absent from the original
    _ACADEMIC_INJECTION_TERMS: list[str] = [
        'fourier', 'series', 'transform', 'properties', 'theorem', 'parseval',
        'linearity', 'harmonic', 'frequency', 'convolution', 'laplace', 'algorithm',
        'complexity', 'eigenvalue', 'integral', 'derivative', 'coefficient',
    ]

    def rewrite_question(self, question: str) -> str | None:
        print(f"[REWRITE] original: {question!r}")

        prompt = (
            "Rewrite the student question as a natural, concise version that keeps all the original meaning.\n\n"
            "Rules (follow strictly):\n"
            "- Return ONLY a natural rewritten version of the question. Nothing else.\n"
            "- Do NOT add metadata phrases like 'academic search query', 'retrieval query',\n"
            "  'semantic search', 'optimized query', 'search query for', or similar wording.\n"
            "- Keep ALL technical terms, names, symbols and concepts EXACTLY as in the original.\n"
            "- Do NOT replace domain terms (e.g. keep Fourier, omega_0, D_k, T_0, Parseval, linearity).\n"
            "- Only fix obvious spelling or grammar mistakes.\n"
            "- Do NOT add concepts that are not in the original question.\n"
            "- Do NOT use previous questions, chat history, retrieved documents, or examples\n"
            "  to infer a new topic. Base the rewrite ONLY on the words in the input below.\n"
            "- If the input is a greeting, short casual phrase, or not an academic question,\n"
            "  return it UNCHANGED.\n"
            "- Do NOT answer the question.\n"
            "- Output ONE line only — just the rewritten question.\n\n"
            "Examples of GOOD rewrites:\n"
            "  Input: 'explain fourier series properties'\n"
            "  Output: Properties of Fourier Series\n\n"
            "  Input: 'what is parseval theorem'\n"
            "  Output: Parseval's theorem explanation\n\n"
            "  Input: 'hello hi'\n"
            "  Output: hello hi\n\n"
            "Examples of BAD rewrites (NEVER do this):\n"
            "  BAD: 'Fourier Series Properties academic search query'\n"
            "  BAD: 'semantic search: fourier series'\n"
            "  BAD: 'retrieval query for Fourier Series Properties'\n"
            "  BAD: introducing a topic (e.g. Fourier) that was NOT in the original input\n\n"
            f"Student question:\n{question}"
        )
        result = self._call_ollama(
            "query rewrite", SYSTEM_PROMPT, prompt,
            timeout=30, temperature=0.1, top_p=0.9,
        )

        if result:
            # Strip any search-engine wording the model may have appended
            result = re.sub(
                r'\s*(?:academic\s+)?(?:search\s+query|retrieval\s+query|semantic\s+search'
                r'|optimized\s+query|search\s+term|query\s+for\s+retrieval)[\s:]*$',
                '',
                result.strip(),
                flags=re.IGNORECASE,
            ).strip()

        print(f"[REWRITE] candidate: {result!r}")
        return result or None

    def summarize_pdf_chunk(self, text: str) -> str | None:
        prompt = (
            "Summarize this PDF chunk into important bullet points. "
            "Use only the provided text. Do not add outside information.\n\n"
            f"PDF chunk:\n{text}"
        )
        return self._call_ollama("pdf chunk summarization", SYSTEM_PROMPT, prompt)

    def summarize_material(self, text: str) -> str | None:
        prompt = (
            "Summarize this PDF material into short bullet points covering the main ideas. "
            "Use only the provided text. Do not add outside information.\n\n"
            f"PDF material:\n{text}"
        )
        return self._call_ollama("material summarization", SYSTEM_PROMPT, prompt)

    def generate_material_summary(
        self,
        context: str,
        length: str = "medium",
        format: str = "study_notes",
        include_formulas: bool = True,
    ) -> str | None:
        length_instruction = {
            "short": (
                "Write ONE short paragraph of 4-6 sentences maximum — OR — exactly 5 bullet points maximum.\n"
                "Do NOT add multiple sections. Keep it extremely concise."
            ),
            "medium": (
                "Write 2-3 clearly separated ## sections.\n"
                "Each section: 3-5 bullet points or 1-2 short paragraphs. Do not over-explain."
            ),
            "detailed": (
                "Write multiple ## sections covering every major concept.\n"
                "Use sub-bullets for supporting details. Be thorough."
            ),
        }.get(length, "Write 2-3 clearly separated sections covering the main ideas.")

        format_instruction = {
            "paragraph": (
                "Use ONLY flowing prose paragraphs. ABSOLUTELY NO bullet points or dashes anywhere.\n"
                "Each section is a paragraph block."
            ),
            "bullet_points": (
                "Use ONLY bullet point lists (- item). ABSOLUTELY NO paragraphs.\n"
                "Every piece of content must be a bullet point."
            ),
            "study_notes": (
                "Use ## headings for each section.\n"
                "Under each heading: bullet points for key ideas, then **Key Takeaway:** one line."
            ),
        }.get(format, "Use ## headings with bullet points under each section.")

        formula_rule = (
            "Include ALL important formulas and equations using LaTeX: $...$ for inline, $$...$$ for block math."
            if include_formulas
            else "Do NOT include any formulas or mathematical expressions. Explain concepts in words only."
        )

        prompt = (
            "Summarize the material below in clean Markdown.\n\n"
            f"=== LENGTH RULE (STRICT) ===\n{length_instruction}\n\n"
            f"=== FORMAT RULE (STRICT) ===\n{format_instruction}\n\n"
            f"=== FORMULA RULE (STRICT) ===\n{formula_rule}\n\n"
            "=== HARD RULES ===\n"
            "* NO intro text like 'Here is', 'Certainly', 'This document'\n"
            "* NO repetition between sections\n"
            "* COMPLETE the full summary — do NOT stop mid-sentence\n"
            "* Do NOT use ``` code fences\n"
            "* Do NOT return JSON\n"
            "* Use ONLY the provided text\n\n"
            f"Text:\n{context}"
        )
        return self._call_ollama("material summary generation", SYSTEM_PROMPT, prompt, num_predict=2000)

    def summarize_page(
        self,
        page_text: str,
        detail_level: str = "normal",
        include_key_terms: bool = True,
        include_formulas: bool = True,
    ) -> str | None:
        detail_instruction = {
            "brief":    "Write EXACTLY 1-2 bullet points. No more. Be extremely terse.",
            "normal":   "Write EXACTLY 3-5 bullet points covering the main ideas on this page.",
            "detailed": "Write 5-8 bullet points with sub-bullets (indented -) for important details.",
        }.get(detail_level, "Write 3-5 bullet points covering the main ideas on this page.")

        key_terms_rule = (
            "After the bullets, add a **Key Terms:** line listing the 2-4 most important terms (comma-separated)."
            if include_key_terms
            else "Do NOT add a Key Terms section."
        )

        formula_rule = (
            "When formulas appear in the text, include them using LaTeX: $...$ inline, $$...$$ block."
            if include_formulas
            else "Do NOT include any formulas or math expressions. Describe them in words if needed."
        )

        prompt = (
            "Summarize this page in clean Markdown.\n\n"
            f"=== DETAIL RULE (STRICT) ===\n{detail_instruction}\n\n"
            f"=== FORMULA RULE (STRICT) ===\n{formula_rule}\n\n"
            f"=== KEY TERMS RULE (STRICT) ===\n{key_terms_rule}\n\n"
            "=== HARD RULES ===\n"
            "* Use **bold** for key terms inline\n"
            "* NO intro text (do not say 'This page covers...' or 'Here is...')\n"
            "* Do NOT return JSON. Do NOT wrap in ``` code fences.\n"
            "* Use ONLY the provided text\n\n"
            f"Page text:\n{page_text}"
        )
        return self._call_ollama("page summary generation", SYSTEM_PROMPT, prompt, num_predict=1200)

    def generate_study_notes(
        self,
        context: str,
        notes_style: str = "bullet_notes",
        detail_level: str = "detailed",
        include_examples: bool = True,
        include_formulas: bool = True,
    ) -> str | None:
        style_instruction = {
            "cornell": (
                "Use STRICT Cornell Note format:\n"
                "For EVERY section write:\n"
                "  ## <Topic Heading>\n"
                "  **Cues / Questions:**\n"
                "  - (question a student might ask)\n"
                "  **Notes:**\n"
                "  - (answer / key content)\n"
                "End the ENTIRE document with a ## Summary section (3-5 bullet points).\n"
                "DO NOT use any other structure."
            ),
            "bullet_notes": (
                "Use ONLY structured bullet-point notes:\n"
                "## Heading for each major topic\n"
                "- Main bullet point\n"
                "  - Sub-bullet for supporting details\n"
                "No paragraphs allowed. Every item must be a bullet."
            ),
            "exam_revision": (
                "Write EXAM-FOCUSED revision notes ONLY:\n"
                "For each topic:\n"
                "  ## <Topic>\n"
                "  **Likely exam question:** <question>\n"
                "  **Key answer points:**\n"
                "  - point 1\n"
                "  - point 2\n"
                "  **Common mistakes:** <mistake to avoid>\n"
                "Focus on what a student must memorise for an exam."
            ),
        }.get(notes_style, "Use clean bullet-point notes with ## headings for each section.")

        detail_instruction = {
            "normal":        "Cover essential points only — 2-3 bullets per concept. Be concise.",
            "detailed":      "Cover each concept thoroughly — 4-6 bullets per concept with supporting details.",
            "very_detailed": "Cover every concept in depth — 6+ bullets. Include edge cases, nuances, and comparisons.",
        }.get(detail_level, "Cover each concept thoroughly with supporting details.")

        example_rule = (
            "After each major concept, add **Example:** followed by a short concrete example."
            if include_examples
            else "Do NOT add any examples. Definitions and facts only."
        )

        formula_rule = (
            "Include ALL important formulas using LaTeX: $...$ for inline, $$...$$ for block math. Label each formula."
            if include_formulas
            else "Do NOT include any formulas or math expressions. Use words to describe mathematical concepts."
        )

        prompt = (
            "Create study notes in clean Markdown.\n\n"
            f"=== STYLE RULE (STRICT) ===\n{style_instruction}\n\n"
            f"=== DETAIL RULE (STRICT) ===\n{detail_instruction}\n\n"
            f"=== EXAMPLES RULE (STRICT) ===\n{example_rule}\n\n"
            f"=== FORMULA RULE (STRICT) ===\n{formula_rule}\n\n"
            "=== HARD RULES ===\n"
            '* NO introductions (do not say "Certainly", "Here is", etc.)\n'
            "* NO repetition between sections\n"
            "* Use **bold** for key terms\n"
            "* COMPLETE the full notes — do NOT stop mid-sentence\n"
            "* Do NOT wrap the whole response in ```markdown\n"
            "* Do NOT return JSON\n\n"
            f"Material:\n{context}"
        )
        return self._call_ollama("study notes generation", SYSTEM_PROMPT, prompt, num_predict=2000)

    # Strict JSON-only system prompt used for quiz/flashcard generation
    _JSON_SYSTEM_PROMPT = (
        "You are a JSON API.\n"
        "Return ONLY valid JSON. No explanations. No markdown. No ```json fences.\n"
        "Escape all quotes inside strings correctly.\n"
        "Output must be a JSON array and nothing else.\n\n"
        + MATH_RULES
    )

    def generate_quiz(
        self,
        context: str,
        num_questions: int,
        difficulty: str = "mixed",
        question_type: str = "mcq",
        retry_prompt: str | None = None,
    ) -> str | None:
        difficulty_instruction = {
            "easy":   (
                "ALL questions must be EASY: direct recall of definitions, names, and basic facts.\n"
                "No application. No tricky wording. Every 'difficulty' field must be \"easy\"."
            ),
            "medium": (
                "ALL questions must be MEDIUM: concept understanding and basic application.\n"
                "Require the student to interpret or apply a concept. Every 'difficulty' field must be \"medium\"."
            ),
            "hard":   (
                "ALL questions must be HARD: formula applications, multi-step reasoning, and tricky comparisons.\n"
                "Avoid simple recall. Every 'difficulty' field must be \"hard\"."
            ),
            "mixed":  (
                "Mix difficulty levels. Distribute roughly: 1/3 easy, 1/3 medium, 1/3 hard.\n"
                "Each item must have a 'difficulty' field set to \"easy\", \"medium\", or \"hard\"."
            ),
        }.get(difficulty, "Use a mix of easy, medium, and hard questions.")

        if question_type == "true_false":
            type_instruction = (
                "ALL questions must be True/False.\n"
                "Each question must have EXACTLY 2 options: [\"A. True\", \"B. False\"].\n"
                "The 'answer' field must be 'A' or 'B'.\n"
                "The 'type' field must be \"true_false\".\n"
                "Make sure roughly half the answers are True and half are False."
            )
            schema_example = (
                '[\n'
                '  {\n'
                '    "type": "true_false",\n'
                '    "difficulty": "medium",\n'
                '    "question": "Claim about the material.",\n'
                '    "options": ["A. True", "B. False"],\n'
                '    "answer": "A",\n'
                '    "explanation": "Brief reason why."\n'
                '  }\n'
                ']'
            )
        elif question_type == "mixed":
            half = max(1, num_questions // 2)
            type_instruction = (
                f"Include AT LEAST {half} MCQ questions AND at least {num_questions - half} True/False questions.\n"
                "For MCQ: EXACTLY 4 options [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], type = \"mcq\".\n"
                "For True/False: EXACTLY 2 options [\"A. True\", \"B. False\"], type = \"true_false\".\n"
                "The 'answer' field is always a single uppercase letter.\n"
                "Alternate MCQ and True/False so both types appear throughout."
            )
            schema_example = (
                '[\n'
                '  {"type":"mcq","difficulty":"medium","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"B","explanation":"..."},\n'
                '  {"type":"true_false","difficulty":"easy","question":"...","options":["A. True","B. False"],"answer":"A","explanation":"..."}\n'
                ']'
            )
        else:  # mcq default
            type_instruction = (
                "ALL questions must be MCQ.\n"
                "Each question must have EXACTLY 4 options: [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"].\n"
                "The 'answer' field must be 'A', 'B', 'C', or 'D'.\n"
                "The 'type' field must be \"mcq\".\n"
                "Distribute correct answers across A, B, C, D — do not always use A."
            )
            schema_example = (
                '[\n'
                '  {\n'
                '    "type": "mcq",\n'
                '    "difficulty": "medium",\n'
                '    "question": "What is X?",\n'
                '    "options": ["A. first", "B. second", "C. third", "D. fourth"],\n'
                '    "answer": "B",\n'
                '    "explanation": "Brief reason why B is correct."\n'
                '  }\n'
                ']'
            )

        base = (
            f"Generate EXACTLY {num_questions} quiz questions from the material below.\n\n"
            f"=== DIFFICULTY RULE (STRICT) ===\n{difficulty_instruction}\n\n"
            f"=== QUESTION TYPE RULE (STRICT) ===\n{type_instruction}\n\n"
            f"{QUIZ_MATH_RULES}\n"
            "=== HARD RULES ===\n"
            "- Use ONLY the provided material. Do NOT add external information.\n"
            "- EVERY question must have an 'explanation' field.\n"
            "- EVERY question must have a 'difficulty' field.\n"
            f"- Output EXACTLY {num_questions} items — not more, not fewer.\n"
            "- Return ONLY a JSON array — no text before or after.\n"
            "- Do NOT wrap in ```json or any markdown fence.\n\n"
            f"Output schema:\n{schema_example}\n\n"
            f"Material:\n{context}"
        )
        user_prompt = f"{retry_prompt}\n\n{base}" if retry_prompt else base
        return self._call_ollama(
            "quiz generation",
            self._JSON_SYSTEM_PROMPT,
            user_prompt,
            num_predict=2048,
            temperature=0.2,
        )

    def generate_flashcards(
        self,
        context: str,
        num_cards: int,
        focus: str = "mixed",
        include_examples: bool = False,
        retry_prompt: str | None = None,
    ) -> str | None:
        focus_instruction = {
            "key_terms": (
                "Create ONLY key-term cards.\n"
                "- front: the term name only (e.g. 'Fourier Series')\n"
                "- back: a clear 1-2 sentence meaning\n"
                "- focus_type: \"key_terms\"\n"
                "Do NOT generate formula cards or definition-style cards."
            ),
            "definitions": (
                "Create ONLY definition cards.\n"
                "- front: 'Define: <concept>' (e.g. 'Define: Periodic Signal')\n"
                "- back: formal definition + one-sentence explanation\n"
                "- focus_type: \"definitions\"\n"
                "Do NOT generate formula cards or key-term-only cards."
            ),
            "formulas": (
                "Create ONLY formula cards.\n"
                "- front: 'What is the formula for <name>?' or '<name> formula' — NO math on front.\n"
                "- back: first write the formula in words (e.g. 'output = input divided by gain'),\n"
                "  then if the formula is simple enough, add it as $...$ inline math.\n"
                "  NEVER use $$...$$ block math or multi-term sums/integrals on flashcard backs.\n"
                "- focus_type: \"formulas\"\n"
                "If the material has fewer formulas than requested, repeat in different forms.\n"
                "Do NOT generate non-formula cards."
            ),
            "mixed": (
                "Create a MIX of card types: key terms, definitions, and formulas.\n"
                "Each card must have a 'focus_type' field: \"key_terms\", \"definitions\", or \"formulas\".\n"
                "Distribute roughly: 1/3 key_terms, 1/3 definitions, 1/3 formulas if formulas exist."
            ),
        }.get(focus, "Cover key terms, definitions, formulas, and important concepts.")

        example_rule = (
            'EVERY card must include an "example" field with a short concrete example (1-2 sentences).\n'
            'The example must be relevant to the card\'s front/back content.'
            if include_examples
            else 'Set "example" to null for EVERY card. Do NOT add examples.'
        )

        schema = (
            '[{"focus_type":"key_terms|definitions|formulas","front":"...","back":"...","example":"...or null"}]'
        )

        prompt = (
            f"Create EXACTLY {num_cards} flashcards from the material below.\n\n"
            f"=== FOCUS RULE (STRICT) ===\n{focus_instruction}\n\n"
            f"=== EXAMPLES RULE (STRICT) ===\n{example_rule}\n\n"
            f"{FLASHCARD_MATH_RULES}\n"
            "=== FLASHCARD STRUCTURE RULES ===\n"
            "- front: short — the term, concept name, or question only. NO equations on the front.\n"
            "- back: plain English answer or definition. Simple $...$ math only if unavoidable.\n"
            "- example: one short readable sentence or null. No formulas in examples.\n\n"
            "=== HARD RULES ===\n"
            "- Use ONLY the provided material.\n"
            f"- Output EXACTLY {num_cards} cards — not more, not fewer.\n"
            "- Return ONLY a valid JSON array — no text before or after.\n"
            "- Do NOT wrap in ```json or any markdown fence.\n"
            "- Use 'front', 'back', 'focus_type', 'example' keys.\n"
            f"- Schema: {schema}\n\n"
            f"Material:\n{context}"
        )
        user_prompt = f"{retry_prompt}\n\n{prompt}" if retry_prompt else prompt
        return self._call_ollama(
            "flashcards generation",
            self._JSON_SYSTEM_PROMPT,
            user_prompt,
            num_predict=2048,
            temperature=0.2,
        )

    def generate_answer(self, context: str, question: str) -> str | None:
        print(f"[qwen_service] generating answer  ctx_len={len(context or '')}  q={question!r:.80}")
        prompt = (
            f"Class context:\n{context}\n\n"
            f"Student question:\n{question}\n\n"
            "Instructions:\n"
            "- Return ONLY the final answer. Do not say 'Here is the answer' or 'Certainly'.\n"
            "- Write ALL math in LaTeX ($...$ for inline, $$...$$ for display equations).\n"
            "- Use Markdown. Use bullet points and bold for key terms.\n"
            "- If the question asks about PROPERTIES or THEOREMS, list EACH property separately.\n"
            "- If the question asks about Fourier Series, cover: linearity, time shift, frequency shift,\n"
            "  symmetry, Parseval's theorem, and coefficient formulas — if they appear in the context.\n"
            "- Provide a complete answer. Do NOT stop mid-sentence.\n"
            "- Do NOT wrap the output in ``` code fences.\n"
            "- Do NOT return JSON.\n"
            "- If the context does not contain enough information to answer, return exactly: SEND_TO_DOCTOR"
        )
        answer = self._call_ollama(
            "answer generation", QA_SYSTEM_PROMPT, prompt,
            timeout=180,
            num_predict=2048,
            temperature=0.15, top_p=0.8, repeat_penalty=1.1,
        )
        if answer:
            print(f"[OLLAMA] answer preview: {answer[:160]}{'...' if len(answer)>160 else ''}")
        else:
            print(f"[OLLAMA] answer generation returned None (model may have timed out or refused)")
        return answer

    # ── OCR / math artifact corrections applied to chunk text before LLM ─────

    _OCR_CORRECTIONS: list[tuple[re.Pattern, str]] = [
        # bare "heta" → \theta (not preceded by a backslash already)
        (re.compile(r'(?<!\\)\bheta\b'),          r'\\theta'),
        # "To " or "T_o" used as period symbol → T_0
        (re.compile(r'\bT_o\b'),                  r'T_0'),
        (re.compile(r'\bTo\b(?=\s*[=\()])'),      r'T_0'),
        # "Dk" or "D k" → D_k (plain text only — D_{...} inside math is fine)
        (re.compile(r'\bD\s*k\b'),                r'D_k'),
        # "wk" or "w_k" → \omega_k, "w0"/"w_0" → \omega_0
        (re.compile(r'\bw_?0\b'),                 r'\\omega_0'),
        (re.compile(r'\bw_?k\b'),                 r'\\omega_k'),
        # double backslash before common commands → single
        (re.compile(r'\\\\(theta|omega|pi|sum|int|frac|infty)\b'), r'\\\1'),
        # NOTE: NO stray-backslash removal — \, \; \! and similar are valid LaTeX spacing
        # duplicate adjacent words (e.g. "the the")
        (re.compile(r'\b(\w+)\s+\1\b', re.IGNORECASE), r'\1'),
        # multiple consecutive spaces → single space
        (re.compile(r'  +'),                       r' '),
    ]

    # Splits text into alternating [plain, math, plain, math, ...] segments.
    # Math segments are anything inside $...$ or $$...$$
    _MATH_SPLIT_RE = re.compile(r'(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)')

    def _apply_corrections_outside_math(
        self, text: str, corrections: list[tuple[re.Pattern, str]]
    ) -> str:
        """Apply regex corrections only to non-math segments of text."""
        parts = self._MATH_SPLIT_RE.split(text)
        out = []
        for i, part in enumerate(parts):
            if i % 2 == 1:
                # math segment — leave untouched
                out.append(part)
            else:
                for pattern, replacement in corrections:
                    part = pattern.sub(replacement, part)
                out.append(part)
        return "".join(out)

    def clean_chunk_text(self, text: str) -> str:
        """Apply OCR/math artifact corrections to a raw chunk before sending to LLM."""
        return self._apply_corrections_outside_math(text, self._OCR_CORRECTIONS)

    # ── Answer post-processing ────────────────────────────────────────────────

    # Named environments that must become $$ ... $$ on the Python side
    _ENV_NAMES = (
        r'equation\*?', r'align\*?', r'gather\*?',
        r'multline\*?', r'eqnarray\*?', r'flalign\*?', r'alignat\*?',
    )
    _ENV_RE = re.compile(
        r'\\begin\{(?:' + '|'.join(_ENV_NAMES) + r')\}'
        r'([\s\S]*?)'
        r'\\end\{(?:' + '|'.join(_ENV_NAMES) + r')\}',
    )

    _POST_CORRECTIONS: list[tuple[re.Pattern, str]] = [
        # \begin{equation*} ... \end{equation*}  →  $$\n...\n$$
        # (handled separately via _ENV_RE because the replacement needs a lambda)
        # \[ ... \] → $$...$$
        (re.compile(r'\\\[([\s\S]*?)\\\]'),         r'$$\n\1\n$$'),
        # \( ... \) → $...$
        (re.compile(r'\\\(([\s\S]*?)\\\)'),         r'$\1$'),
        # Bare OCR artefacts that survived in the answer
        (re.compile(r'(?<!\\)\bheta\b'),            r'\\theta'),
        (re.compile(r'\bT_o\b'),                    r'T_0'),
        (re.compile(r'\bD\s*k\b'),                  r'D_k'),
        (re.compile(r'\bw_?0\b'),                   r'\\omega_0'),
        # Double backslash before LaTeX commands
        (re.compile(r'\\\\(theta|omega|pi|sum|int|frac|infty)\b'), r'\\\1'),
        # Multiple blank lines → one blank line
        (re.compile(r'\n{3,}'),                     r'\n\n'),
        # Trailing whitespace on lines
        (re.compile(r'[ \t]+\n'),                   r'\n'),
    ]

    def post_process_answer(self, text: str) -> str:
        result = text.strip()
        # Convert \begin{equation} ... \end{equation} → $$ ... $$
        result = self._ENV_RE.sub(
            lambda m: f'$$\n{m.group(1).strip()}\n$$', result
        )
        # Apply remaining corrections (OCR artefacts, blank lines, whitespace)
        # using the math-safe helper so we never corrupt formula content
        result = self._apply_corrections_outside_math(result, self._POST_CORRECTIONS)
        return result.strip()

    def answer_question(
        self, question: str, context_items: list[dict[str, Any]]
    ) -> dict[str, Any]:
        context_blocks = []
        material_summaries_added: set[Any] = set()

        for index, item in enumerate(context_items, start=1):
            source_line = f"[{index}] Source: {item['source_name']}"
            if item.get("page_number") is not None:
                source_line += f" | Page {item['page_number']}"
            # Clean OCR artifacts from chunk text before injecting into prompt
            raw_chunk = item.get("chunk_text", "")
            clean_chunk = self.clean_chunk_text(raw_chunk)
            context_block = f"{source_line}\n{clean_chunk}"
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
            return {"decision": "sent_to_doctor", "answer": "", "confidence": 0.0}

        normalized = raw_answer.strip()
        normalized = normalized.removeprefix("```json").removeprefix("```markdown")
        normalized = normalized.removeprefix("```").removesuffix("```").strip()
        if normalized.upper() == "SEND_TO_DOCTOR":
            return {"decision": "sent_to_doctor", "answer": "", "confidence": 0.0}

        # Post-process: fix surviving artefacts and normalise math delimiters
        normalized = self.post_process_answer(normalized)

        return {"decision": "answered", "answer": normalized, "confidence": 0.7}

    def generate_general_answer(self, question: str) -> str | None:
        prompt = (
            f"Student question:\n{question}\n\n"
            "Return only the final answer.\n"
            "Return clean Markdown only.\n"
            "Do not wrap the output in code fences.\n"
            "Do not return JSON."
        )
        return self._call_ollama("general answer generation", GENERAL_SYSTEM_PROMPT, prompt)
