import hashlib
import logging
import math
import os
import re
from typing import Any, List, Optional

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1"
        self.dimensions = settings.EMBEDDING_DIMENSIONS
        self.client = None
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

    def _fallback_embedding(self, text: str) -> List[float]:
        vector = [0.0] * self.dimensions
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        if not tokens:
            return vector

        for token_index, token in enumerate(tokens):
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            for offset, byte in enumerate(digest[:8]):
                index = (token_index * 17 + offset * 31 + byte) % self.dimensions
                vector[index] += 1.0 / (1 + token_index)

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    def embed_text(self, text: str) -> List[float]:
        try:
            if self.client:
                response = self.client.embeddings.create(
                    model="text-embedding-3-small",
                    input=text,
                )
                return response.data[0].embedding
        except Exception as exc:
            logger.warning("Embedding API failed, falling back to deterministic embedding: %s", exc)
        return self._fallback_embedding(text)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        try:
            if self.client:
                response = self.client.embeddings.create(
                    model="text-embedding-3-small",
                    input=texts,
                )
                return [item.embedding for item in response.data]
        except Exception as exc:
            logger.warning("Embedding API failed, falling back to deterministic embedding: %s", exc)
        return [self._fallback_embedding(text) for text in texts]
