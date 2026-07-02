import json
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.vector.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class VectorSearchService:
    def __init__(self, session_factory=SessionLocal):
        self.session_factory = session_factory

    def store_embeddings(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            return

        with self.session_factory() as session:
            for row in rows:
                session.execute(
                    text(
                        """
                        insert into search_documents (
                            id, organization_id, entity_type, entity_id, source_table, source_field,
                            chunk_index, chunk_type, content, metadata, embedding, created_at, updated_at
                        ) values (
                            :id, :organization_id, :entity_type, :entity_id, :source_table, :source_field,
                            :chunk_index, :chunk_type, :content, :metadata, :embedding, now(), now()
                        )
                        on conflict (id) do update set
                            organization_id = excluded.organization_id,
                            entity_type = excluded.entity_type,
                            entity_id = excluded.entity_id,
                            source_table = excluded.source_table,
                            source_field = excluded.source_field,
                            chunk_index = excluded.chunk_index,
                            chunk_type = excluded.chunk_type,
                            content = excluded.content,
                            metadata = excluded.metadata,
                            embedding = excluded.embedding,
                            updated_at = now()
                        """
                    ),
                    {
                        "id": row.get("id"),
                        "organization_id": row.get("organization_id"),
                        "entity_type": row.get("entity_type"),
                        "entity_id": row.get("entity_id"),
                        "source_table": row.get("source_table"),
                        "source_field": row.get("source_field"),
                        "chunk_index": row.get("chunk_index"),
                        "chunk_type": row.get("chunk_type"),
                        "content": row.get("content"),
                        "metadata": json.dumps(row.get("metadata") or {}),
                        "embedding": row.get("embedding"),
                    },
                )
            session.commit()

    def delete_embeddings(self, entity_type: str, entity_id: str, organization_id: Optional[str] = None) -> None:
        with self.session_factory() as session:
            if organization_id:
                session.execute(
                    text(
                        "delete from search_documents where entity_type = :entity_type and entity_id = :entity_id and organization_id = :organization_id"
                    ),
                    {"entity_type": entity_type, "entity_id": entity_id, "organization_id": organization_id},
                )
            else:
                session.execute(
                    text(
                        "delete from search_documents where entity_type = :entity_type and entity_id = :entity_id"
                    ),
                    {"entity_type": entity_type, "entity_id": entity_id},
                )
            session.commit()

    def search_similar(self, query: str, organization_id: Optional[str] = None, limit: int = 15) -> List[Dict[str, Any]]:
        embedding_service = EmbeddingService(
            api_key=settings.ACCOUNTS_OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )
        embedding = embedding_service.embed_texts([query])[0]
        embedding = embedding[: settings.EMBEDDING_DIMENSIONS]
        if len(embedding) < settings.EMBEDDING_DIMENSIONS:
            embedding = embedding + [0.0] * (settings.EMBEDDING_DIMENSIONS - len(embedding))

        with self.session_factory() as session:
            params: Dict[str, Any] = {"query": embedding, "limit": limit}
            where_clause = ""
            if organization_id:
                where_clause = "and organization_id = :organization_id"
                params["organization_id"] = organization_id

            result = session.execute(
                text(
                    f"""
                    select id, organization_id, entity_type, entity_id, source_table, source_field,
                           chunk_index, chunk_type, content, metadata, created_at, updated_at,
                           1 - (embedding <=> CAST(:query AS vector)) as similarity
                    from search_documents
                    where embedding is not null {where_clause}
                    order by embedding <=> CAST(:query AS vector)
                    limit :limit
                    """
                ),
                params,
            )
            return [dict(row._mapping) for row in result.fetchall()]
