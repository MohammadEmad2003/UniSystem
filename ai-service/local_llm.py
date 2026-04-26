"""
Local 4-bit quantized Qwen runner using llama-cpp-python.

On first use, the GGUF model file is downloaded from Hugging Face into LOCAL_MODEL_DIR
(default: ./models/) and loaded with llama.cpp. No Ollama required.

Defaults to Qwen2.5-1.5B-Instruct Q4_K_M (~1 GB, runs comfortably on CPU).
"""

from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Optional


SYSTEM_PROMPT_DEFAULT = (
    "You are a helpful academic assistant. Be accurate and concise."
)


class LocalLLM:
    """Singleton-style wrapper around a llama-cpp Llama instance."""

    _instance: Optional["LocalLLM"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self.repo_id = os.getenv("LOCAL_MODEL_REPO", "Qwen/Qwen2.5-1.5B-Instruct-GGUF")
        self.filename = os.getenv("LOCAL_MODEL_FILE", "qwen2.5-1.5b-instruct-q4_k_m.gguf")
        self.model_dir = Path(os.getenv("LOCAL_MODEL_DIR", "./models")).resolve()
        self.n_ctx = int(os.getenv("LOCAL_MODEL_CTX", "4096"))
        self.n_threads = int(os.getenv("LOCAL_MODEL_THREADS", "4"))
        self.n_gpu_layers = int(os.getenv("LOCAL_MODEL_GPU_LAYERS", "0"))
        self._llm = None

    @classmethod
    def get(cls) -> "LocalLLM":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def _resolve_model_path(self) -> Path:
        """Download the GGUF file from HF if missing; return the local path."""
        self.model_dir.mkdir(parents=True, exist_ok=True)
        target = self.model_dir / self.filename
        if target.exists():
            return target

        try:
            from huggingface_hub import hf_hub_download
        except ImportError as exc:
            raise RuntimeError(
                "huggingface_hub is required to download the local model. "
                "Install it with: pip install huggingface_hub"
            ) from exc

        print(f"[local_llm] Downloading {self.repo_id}/{self.filename} → {self.model_dir} ...")
        downloaded = hf_hub_download(
            repo_id=self.repo_id,
            filename=self.filename,
            local_dir=str(self.model_dir),
        )
        return Path(downloaded)

    def _load(self):
        if self._llm is not None:
            return self._llm
        try:
            from llama_cpp import Llama
        except ImportError as exc:
            raise RuntimeError(
                "llama-cpp-python is required to run the local model. "
                "Install it with: pip install llama-cpp-python"
            ) from exc

        path = self._resolve_model_path()
        print(f"[local_llm] Loading {path.name} (ctx={self.n_ctx}, threads={self.n_threads})")
        self._llm = Llama(
            model_path=str(path),
            n_ctx=self.n_ctx,
            n_threads=self.n_threads,
            n_gpu_layers=self.n_gpu_layers,
            verbose=False,
        )
        return self._llm

    def generate(self, prompt: str, system: str = SYSTEM_PROMPT_DEFAULT,
                 max_tokens: int = 1024, temperature: float = 0.2) -> Optional[str]:
        """Run a chat completion using Qwen's chat format."""
        try:
            llm = self._load()
            result = llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            content = result["choices"][0]["message"]["content"]
            return (content or "").strip() or None
        except Exception as exc:
            print(f"[local_llm] generation failed: {exc}")
            return None
