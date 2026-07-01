from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from app.core.database import SessionLocal
from app.services.vector import EmbeddingService, VectorSearchService
from app.services.vector.chunking import chunk_document

router = APIRouter(prefix="/vector", tags=["vector"])


class VectorIndexRequest(BaseModel):
    organization_id: str
    entity_type: str
    entity_id: str
    source_table: str
    source_field: str = "content"
    content: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


@router.post("/index")
def index_document(payload: VectorIndexRequest):
    embedding_service = EmbeddingService()
    vector_service = VectorSearchService()
    chunks = chunk_document(payload.content, max_tokens=700, overlap_tokens=100)
    if not chunks:
        raise HTTPException(status_code=400, detail="No content to index")

    embeddings = embedding_service.embed_texts(chunks)
    rows = []
    for idx, chunk in enumerate(chunks):
        rows.append(
            {
                "organization_id": payload.organization_id,
                "entity_type": payload.entity_type,
                "entity_id": payload.entity_id,
                "source_table": payload.source_table,
                "source_field": payload.source_field,
                "chunk_index": idx,
                "chunk_type": "semantic",
                "content": chunk,
                "metadata": {**payload.metadata, "embedding_model": "text-embedding-3-small"},
                "embedding": embeddings[idx],
            }
        )
    vector_service.store_embeddings(rows)
    return {"status": "ok", "chunks": len(rows)}


@router.get("/search")
def search(query: str = Query(...), organization_id: Optional[str] = None, limit: int = 15):
    service = VectorSearchService()
    return service.search_similar(query, organization_id=organization_id, limit=limit)
