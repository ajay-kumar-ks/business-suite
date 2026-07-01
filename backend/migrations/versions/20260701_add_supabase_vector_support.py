"""Add pgvector search_documents table for Supabase embeddings

Revision ID: 20260701_add_supabase_vector_support
Revises: 
Create Date: 2026-07-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260701_add_supabase_vector_support'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    op.execute('''
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
    )
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS idx_search_documents_org ON search_documents(organization_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_search_documents_entity ON search_documents(entity_type, entity_id)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_search_documents_updated ON search_documents(updated_at DESC)')
    op.execute("CREATE INDEX IF NOT EXISTS idx_search_documents_content_trgm ON search_documents USING gin (to_tsvector('english', content))")
    op.execute('CREATE INDEX IF NOT EXISTS idx_search_documents_embedding_hnsw ON search_documents USING hnsw (embedding vector_cosine_ops)')


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS idx_search_documents_embedding_hnsw')
    op.execute('DROP INDEX IF EXISTS idx_search_documents_content_trgm')
    op.execute('DROP INDEX IF EXISTS idx_search_documents_updated')
    op.execute('DROP INDEX IF EXISTS idx_search_documents_entity')
    op.execute('DROP INDEX IF EXISTS idx_search_documents_org')
    op.execute('DROP TABLE IF EXISTS search_documents')
    op.execute('DROP EXTENSION IF EXISTS vector')
