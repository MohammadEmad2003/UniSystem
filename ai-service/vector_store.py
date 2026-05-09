from __future__ import annotations

import os
import uuid
from typing import Any

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models

load_dotenv()


class VectorStore:
    QA_COLLECTION = "class_qa_embeddings"
    MATERIAL_COLLECTION = "class_material_embeddings"

    def __init__(self, vector_size: int) -> None:
        use_memory = os.getenv("QDRANT_IN_MEMORY", "true").lower() == "true"
        qdrant_path = os.getenv("QDRANT_PATH", "./qdrant_storage")

        if use_memory:
            print("[Qdrant] mode: in-memory (data lost on restart)")
            self.client = QdrantClient(":memory:")
        else:
            import pathlib
            pathlib.Path(qdrant_path).mkdir(parents=True, exist_ok=True)
            print(f"[Qdrant] mode: persistent at {qdrant_path}")
            self.client = QdrantClient(path=qdrant_path)

        self.vector_size = vector_size
        self._ensure_collection(self.QA_COLLECTION)
        self._ensure_collection(self.MATERIAL_COLLECTION)

    def _ensure_collection(self, collection_name: str) -> None:
        try:
            self.client.get_collection(collection_name)
        except Exception:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=self.vector_size,
                    distance=models.Distance.COSINE,
                ),
            )

    def _question_point_id(self, question_id: int) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"qa:{question_id}"))

    def _material_point_id(self, material_id: int, index: int) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"material:{material_id}:{index}"))

    def _class_material_point_id(
        self, class_id: int, material_id: int, index: int
    ) -> str:
        return str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"class-material:{class_id}:{material_id}:{index}",
            )
        )

    def delete_by_field(self, collection_name: str, field_name: str, value: Any) -> None:
        self.client.delete(
            collection_name=collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key=field_name,
                            match=models.MatchValue(value=value),
                        )
                    ]
                )
            ),
            wait=True,
        )

    def replace_question(self, record: dict[str, Any]) -> None:
        self.delete_by_field(self.QA_COLLECTION, "question_id", record["question_id"])
        self._upsert(self.QA_COLLECTION, [self._qa_point(record)])

    @staticmethod
    def _qa_payload(record: dict[str, Any]) -> dict[str, Any]:
        return {
            "class_id":         record["class_id"],
            "question_id":      record["question_id"],
            "answer_id":        record.get("answer_id"),
            "question_text":    record["question_text"],
            "answer_text":      record["answer_text"],
            "asked_by_id":      record.get("asked_by_id", ""),
            "asked_by_name":    record.get("asked_by_name", ""),
            "asked_by_role":    record.get("asked_by_role", "student"),
            "asked_at":         record.get("asked_at", ""),
            "answered_by_id":   record.get("answered_by_id", ""),
            "answered_by_name": record.get("answered_by_name", ""),
            "answered_by_role": record.get("answered_by_role", "doctor"),
            "answered_at":      record.get("answered_at", ""),
        }

    def _qa_point(self, record: dict[str, Any]) -> dict[str, Any]:
        return {
            "id":      self._question_point_id(record["question_id"]),
            "vector":  record["vector"],
            "payload": self._qa_payload(record),
        }

    def replace_material_chunks(self, material_id: int, chunks: list[dict[str, Any]]) -> None:
        self.delete_by_field(self.MATERIAL_COLLECTION, "material_id", material_id)
        points = []

        for index, chunk in enumerate(chunks):
            points.append(
                {
                    "id": self._material_point_id(material_id, index),
                    "vector": chunk["vector"],
                    "payload": {
                        "class_id": chunk["class_id"],
                        "material_id": chunk["material_id"],
                        "material_name": chunk["material_name"],
                        "material_type": chunk["material_type"],
                        "text": chunk["text"],
                        "summary": chunk["summary"],
                        "material_summary": chunk["material_summary"],
                        "chunk_index": chunk["chunk_index"],
                        "source_type": chunk["source_type"],
                        "text_source_field": chunk["text_source_field"],
                        "chunk_text": chunk["chunk_text"],
                        "source_name": chunk["source_name"],
                        "page_number": chunk.get("page_number"),
                    },
                }
            )

        self._upsert(self.MATERIAL_COLLECTION, points)

    def count_qa_by_class(self, class_id: int) -> int:
        result = self.client.count(
            collection_name=self.QA_COLLECTION,
            count_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="class_id",
                        match=models.MatchValue(value=class_id),
                    )
                ]
            ),
            exact=True,
        )
        return result.count

    def delete_qa_by_class(self, class_id: int) -> int:
        deleted = self.count_qa_by_class(class_id)
        self.delete_by_field(self.QA_COLLECTION, "class_id", class_id)
        return deleted

    def bulk_replace_questions(self, class_id: int, records: list[dict[str, Any]]) -> None:
        self.delete_by_field(self.QA_COLLECTION, "class_id", class_id)
        self._upsert(self.QA_COLLECTION, [self._qa_point(r) for r in records])

    def bulk_replace_materials(self, class_id: int, chunks: list[dict[str, Any]]) -> None:
        self.delete_by_field(self.MATERIAL_COLLECTION, "class_id", class_id)
        points = []

        for index, chunk in enumerate(chunks):
            points.append(
                {
                    "id": self._class_material_point_id(
                        class_id, chunk["material_id"], index
                    ),
                    "vector": chunk["vector"],
                    "payload": {
                        "class_id": chunk["class_id"],
                        "material_id": chunk["material_id"],
                        "material_name": chunk["material_name"],
                        "material_type": chunk["material_type"],
                        "text": chunk["text"],
                        "summary": chunk["summary"],
                        "material_summary": chunk["material_summary"],
                        "chunk_index": chunk["chunk_index"],
                        "source_type": chunk["source_type"],
                        "text_source_field": chunk["text_source_field"],
                        "chunk_text": chunk["chunk_text"],
                        "source_name": chunk["source_name"],
                        "page_number": chunk.get("page_number"),
                    },
                }
            )

        self._upsert(self.MATERIAL_COLLECTION, points)

    def search_questions(self, vector: list[float], class_id: int, limit: int = 1):
        result = self.client.query_points(
            collection_name=self.QA_COLLECTION,
            query=vector,
            query_filter=self._class_filter(class_id),
            limit=limit,
            with_payload=True,
        )
        return result.points

    def search_materials(self, vector: list[float], class_id: int, limit: int = 5):
        result = self.client.query_points(
            collection_name=self.MATERIAL_COLLECTION,
            query=vector,
            query_filter=self._class_filter(class_id),
            limit=limit,
            with_payload=True,
        )
        return result.points

    def _upsert(self, collection_name: str, items: list[dict[str, Any]]) -> None:
        if not items:
            return

        points = [
            models.PointStruct(
                id=item["id"],
                vector=item["vector"],
                payload=item["payload"],
            )
            for item in items
        ]

        self.client.upsert(
            collection_name=collection_name,
            points=points,
            wait=True,
        )

    def _class_filter(self, class_id: int) -> models.Filter:
        return models.Filter(
            must=[
                models.FieldCondition(
                    key="class_id",
                    match=models.MatchValue(value=class_id),
                )
            ]
        )
