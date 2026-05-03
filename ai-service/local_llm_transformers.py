"""
Local Qwen2.5-1.5B-Instruct runner using HuggingFace transformers + PyTorch CPU.
Model is downloaded from HuggingFace on first use (~1.5 GB, stored in HF cache).
"""
from __future__ import annotations

import os
import threading
from typing import Optional

MODEL_ID = os.getenv("TRANSFORMERS_MODEL_ID", "Qwen/Qwen2.5-1.5B-Instruct")


class TransformersLLM:
    _instance: Optional["TransformersLLM"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self.model_id = MODEL_ID
        self._tokenizer = None
        self._model = None

    @classmethod
    def get(cls) -> "TransformersLLM":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def _is_cached(self) -> bool:
        """Return True if the model weights are already in the HuggingFace cache."""
        try:
            from huggingface_hub import try_to_load_from_cache
            result = try_to_load_from_cache(self.model_id, "model.safetensors")
            return result is not None and result != "not_in_cache"
        except Exception:
            return False

    def _load(self):
        if self._model is not None:
            print(f"[transformers_llm] {self.model_id} already in memory.")
            return self._tokenizer, self._model
        if self._is_cached():
            print(f"[transformers_llm] {self.model_id} found in cache — loading...")
        else:
            print(f"[transformers_llm] {self.model_id} not cached — downloading (~1.5 GB)...")
        from transformers import AutoTokenizer, AutoModelForCausalLM
        import torch
        self._tokenizer = AutoTokenizer.from_pretrained(self.model_id)
        self._model = AutoModelForCausalLM.from_pretrained(
            self.model_id,
            dtype=torch.float32,
            device_map="cpu",
        )
        self._model.eval()
        print(f"[transformers_llm] {self.model_id} loaded and ready.")
        return self._tokenizer, self._model

    def generate(self, prompt: str, system: str = "", max_new_tokens: int = 512,
                 temperature: float = 0.3) -> Optional[str]:
        try:
            import torch
            tokenizer, model = self._load()
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            text = tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = tokenizer([text], return_tensors="pt")

            with torch.no_grad():
                output_ids = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=temperature > 0,
                    pad_token_id=tokenizer.eos_token_id,
                )

            new_ids = output_ids[0][inputs["input_ids"].shape[1]:]
            response = tokenizer.decode(new_ids, skip_special_tokens=True).strip()
            return response or None
        except Exception as exc:
            print(f"[transformers_llm] generation failed: {exc}")
            return None
