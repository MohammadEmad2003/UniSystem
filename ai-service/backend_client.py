from __future__ import annotations

import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()


class BackendClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("BACKEND_API_URL", "http://localhost:3000").rstrip("/")
        self.internal_api_key = os.getenv("INTERNAL_API_KEY", "").strip()

        if not self.internal_api_key:
            raise ValueError("INTERNAL_API_KEY must be configured for the AI service.")

        self.session = requests.Session()
        self.session.headers.update(
            {
                "x-internal-api-key": self.internal_api_key,
                "Accept": "application/json",
            }
        )

    def get_class_questions(self, class_id: int) -> list[dict[str, Any]]:
        return self._get(f"/api/internal/ai/classes/{class_id}/questions")

    def get_class_materials(self, class_id: int) -> list[dict[str, Any]]:
        return self._get(f"/api/internal/ai/classes/{class_id}/materials")

    def get_question(self, question_id: int) -> dict[str, Any] | None:
        return self._get(f"/api/internal/ai/questions/{question_id}", allow_404=True)

    def get_material(self, material_id: int) -> dict[str, Any] | None:
        return self._get(f"/api/internal/ai/materials/{material_id}", allow_404=True)

    def _get(self, path: str, allow_404: bool = False):
        response = self.session.get(f"{self.base_url}{path}", timeout=60)

        if allow_404 and response.status_code == 404:
            return None

        response.raise_for_status()
        payload = response.json()
        return payload.get("data")
