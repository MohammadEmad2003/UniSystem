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


def get_total_ram_gb() -> float:
    # Try reading /proc/meminfo (Linux/HF Spaces)
    try:
        with open('/proc/meminfo', 'r') as f:
            for line in f:
                if line.startswith('MemTotal:'):
                    parts = line.split()
                    if len(parts) >= 2:
                        return float(parts[1]) / (1024 * 1024)
    except Exception:
        pass

    # Try Windows wmic
    try:
        import subprocess
        output = subprocess.check_output('wmic computersystem get totalphysicalmemory', shell=True).decode()
        lines = [line.strip() for line in output.split('\n') if line.strip()]
        if len(lines) >= 2:
            return float(lines[1]) / (1024 ** 3)
    except Exception:
        pass

    # Try sysconf (Unix)
    try:
        pages = os.sysconf('SC_PHYS_PAGES')
        page_size = os.sysconf('SC_PAGE_SIZE')
        return (pages * page_size) / (1024 ** 3)
    except Exception:
        pass

    return 4.0


class LocalLLM:
    """Singleton-style wrapper around a llama-cpp Llama instance."""

    _instance: Optional["LocalLLM"] = None
    _lock = threading.Lock()
    _inference_lock = threading.Lock()

    def __init__(self) -> None:
        self.model_dir = Path(os.getenv("LOCAL_MODEL_DIR", "./models")).resolve()
        self.n_ctx = int(os.getenv("LOCAL_MODEL_CTX", "4096"))
        self.n_threads = int(os.getenv("LOCAL_MODEL_THREADS", str(os.cpu_count() or 4)))
        self.n_gpu_layers = int(os.getenv("LOCAL_MODEL_GPU_LAYERS", "0"))
        self.n_batch = int(os.getenv("LOCAL_MODEL_BATCH", "256"))
        self._llm = None

        # Task 2: RAM-based model selection
        ram_gb = get_total_ram_gb()
        print(f"[local_llm] Detected total physical memory: {ram_gb:.2f} GB")
        
        if ram_gb >= 7.5:
            default_repo = "Qwen/Qwen2.5-3B-Instruct-GGUF"
            default_file = "qwen2.5-3b-instruct-q4_k_m.gguf"
        elif ram_gb >= 3.5:
            default_repo = "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
            default_file = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
        else:
            default_repo = "Qwen/Qwen2.5-0.5B-Instruct-GGUF"
            default_file = "qwen2.5-0.5b-instruct-q4_k_m.gguf"

        # Safe fallback lists
        self._fallback_list = [
            ("Qwen/Qwen2.5-3B-Instruct-GGUF", "qwen2.5-3b-instruct-q4_k_m.gguf"),
            ("Qwen/Qwen2.5-1.5B-Instruct-GGUF", "qwen2.5-1.5b-instruct-q4_k_m.gguf"),
            ("Qwen/Qwen2.5-0.5B-Instruct-GGUF", "qwen2.5-0.5b-instruct-q4_k_m.gguf")
        ]

        self.repo_id = os.getenv("LOCAL_MODEL_REPO", default_repo)
        self.filename = os.getenv("LOCAL_MODEL_FILE", default_file)
        
        # Task 3: mlock only if enough RAM exists (>= 8GB)
        self.use_mlock = os.getenv("LOCAL_MODEL_MLOCK", "true" if ram_gb >= 8.0 else "false").lower() == "true"
        self.use_mmap = os.getenv("LOCAL_MODEL_MMAP", "true").lower() == "true"

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

        # Find starting index in our fallback list
        try:
            idx = next(i for i, (r, f) in enumerate(self._fallback_list) if r == self.repo_id or f == self.filename)
        except StopIteration:
            idx = 1 # default to 1.5B fallback

        for repo, file in self._fallback_list[idx:]:
            self.repo_id = repo
            self.filename = file
            try:
                path = self._resolve_model_path()
                print(f"[local_llm] Loading {path.name} (ctx={self.n_ctx}, threads={self.n_threads}, batch={self.n_batch}, mlock={self.use_mlock}, mmap={self.use_mmap})")
                
                # Try loading with flash attention if supported
                try:
                    self._llm = Llama(
                        model_path=str(path),
                        n_ctx=self.n_ctx,
                        n_batch=self.n_batch,
                        n_threads=self.n_threads,
                        n_gpu_layers=self.n_gpu_layers,
                        use_mlock=self.use_mlock,
                        use_mmap=self.use_mmap,
                        flash_attn=True,
                        verbose=False,
                    )
                except TypeError:
                    self._llm = Llama(
                        model_path=str(path),
                        n_ctx=self.n_ctx,
                        n_batch=self.n_batch,
                        n_threads=self.n_threads,
                        n_gpu_layers=self.n_gpu_layers,
                        use_mlock=self.use_mlock,
                        use_mmap=self.use_mmap,
                        verbose=False,
                    )
                print(f"[local_llm] Successfully loaded model: {self.filename}")
                return self._llm
            except Exception as exc:
                print(f"[local_llm] Failed to load/download model {file}: {exc}")
                print("[local_llm] Attempting auto-fallback to next model size...")
                
        # If all fail, raise exception
        raise RuntimeError("All models in the fallback list failed to load/download.")

    def generate(self, prompt: str, system: str = SYSTEM_PROMPT_DEFAULT,
                 max_tokens: int = 1024, temperature: float = 0.2) -> Optional[str]:
        """Run a chat completion using Qwen's chat format."""
        try:
            llm = self._load()
            with self._inference_lock:
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
