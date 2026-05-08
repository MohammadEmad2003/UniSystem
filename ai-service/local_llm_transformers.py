"""
Stub — local Transformers LLM has been replaced by Ollama.
This file is kept so any stale import does not crash the service.
"""
from __future__ import annotations


class TransformersLLM:
    @classmethod
    def get(cls) -> "TransformersLLM":
        return cls()

    def _load(self) -> None:
        print("[transformers_llm] stub — Ollama is the active LLM backend.")

    def generate(self, *args, **kwargs) -> None:
        return None
