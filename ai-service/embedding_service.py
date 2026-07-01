from __future__ import annotations

import os

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()


class EmbeddingService:
    def __init__(self) -> None:
        self.model_name = os.getenv(
            "EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"
        )
        self.model = SentenceTransformer(self.model_name)
        self.vector_size = self.model.get_sentence_embedding_dimension()

    def embed_text(self, text: str) -> list[float]:
        normalized = (text or "").strip()
        if not normalized:
            raise ValueError("Text to embed cannot be empty.")

        return self.model.encode(normalized, normalize_embeddings=True).tolist()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        cleaned = [text.strip() for text in texts if text and text.strip()]
        if not cleaned:
            return []

        vectors = self.model.encode(cleaned, normalize_embeddings=True)
        return vectors.tolist()
