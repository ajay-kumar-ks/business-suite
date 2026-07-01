CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS search_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    source_table TEXT,
    source_field TEXT,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    chunk_type TEXT,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    embedding_model TEXT DEFAULT 'text-embedding-3-small'
);

CREATE INDEX IF NOT EXISTS idx_search_documents_org ON search_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_search_documents_entity ON search_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_search_documents_updated ON search_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_documents_content_trgm ON search_documents USING gin (to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_search_documents_embedding_hnsw
ON search_documents
USING hnsw (embedding vector_cosine_ops);
