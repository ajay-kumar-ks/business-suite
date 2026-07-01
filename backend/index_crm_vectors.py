import os
import uuid
from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.services.vector.chunking import chunk_document
from app.services.vector.embedding_service import EmbeddingService
from app.services.vector.search_service import VectorSearchService
from app.modules.crm.db_models import Contact, Activity, Lead, Client, Pipeline, Phase, PipelineAssignment

DATABASE_URL = (
    settings.SUPABASE_DATABASE_URL
    or os.getenv("SUPABASE_DATABASE_URL")
    or "postgresql://postgres.ykumusptahqbjoroocmj:ajayadishnabeelabhijith@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
)

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})
SessionLocal = sessionmaker(bind=engine)


def make_uuid(value):
    if not value:
        return None
    if isinstance(value, UUID):
        return str(value)
    try:
        return str(UUID(str(value)))
    except Exception:
        return str(value)


def make_chunk_id(entity_type, entity_id, source_table, source_field, chunk_index):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{entity_type}:{entity_id}:{source_table}:{source_field}:{chunk_index}"))


def index_rows(rows, entity_type, source_table, organization_id, metadata_builder):
    embedding_service = EmbeddingService()
    vector_service = VectorSearchService(session_factory=lambda: SessionLocal())
    for row in rows:
        content = metadata_builder(row)
        if not content:
            continue
        chunks = chunk_document(content, max_tokens=700, overlap_tokens=100)
        if not chunks:
            continue
        embeddings = embedding_service.embed_texts(chunks)
        vector_rows = []
        for idx, chunk in enumerate(chunks):
            vector_rows.append({
                "id": make_chunk_id(entity_type, make_uuid(getattr(row, 'id', None)), source_table, 'content', idx),
                "organization_id": organization_id,
                "entity_type": entity_type,
                "entity_id": make_uuid(getattr(row, 'id', None)),
                "source_table": source_table,
                "source_field": "content",
                "chunk_index": idx,
                "chunk_type": "semantic",
                "content": chunk,
                "metadata": {
                    **metadata_builder(row, as_metadata=True),
                    "embedding_model": "text-embedding-3-small",
                },
                "embedding": embeddings[idx],
            })
        vector_service.store_embeddings(vector_rows)


def crm_metadata(row, as_metadata=False):
    if row.__class__.__name__ == 'Contact':
        fields = [
            f"Name: {row.name or ''}",
            f"Email: {row.email or ''}",
            f"Phone: {row.phone or ''}",
            f"Company: {row.company or ''}",
            f"Job Title: {row.job_title or ''}",
            f"Address: {row.address or ''}",
            f"Notes: {row.notes or ''}",
            f"Status: {row.status or ''}",
            f"Source: {row.source or ''}",
        ]
        content = "\n".join([f for f in fields if f.split(':', 1)[1].strip()])
        if as_metadata:
            return {
                "contact_name": row.name,
                "company": row.company,
                "email": row.email,
                "phone": row.phone,
                "status": row.status,
            }
        return content

    if row.__class__.__name__ == 'Activity':
        fields = [
            f"Activity Type: {row.activity_type or ''}",
            f"Title: {row.title or ''}",
            f"Description: {row.description or ''}",
            f"Follow Up: {row.follow_up_date or ''}",
        ]
        content = "\n".join([f for f in fields if f.split(':', 1)[1].strip()])
        if as_metadata:
            return {"activity_type": row.activity_type, "contact_id": row.contact_id}
        return content

    if row.__class__.__name__ == 'Lead':
        fields = [
            f"Title: {row.title or ''}",
            f"Value: {row.value or ''}",
            f"Expected Close Date: {row.expected_close_date or ''}",
            f"Assignee: {row.assignee or ''}",
            f"Source: {row.source or ''}",
            f"Notes: {row.notes or ''}",
        ]
        content = "\n".join([f for f in fields if f.split(':', 1)[1].strip()])
        if as_metadata:
            return {"pipeline_id": row.pipeline_id, "phase_id": row.phase_id, "assignee": row.assignee}
        return content

    if row.__class__.__name__ == 'Client':
        fields = [
            f"Status: {row.status or ''}",
            f"Tier: {row.tier or ''}",
            f"Account Manager: {row.account_manager or ''}",
            f"Renewal Date: {row.renewal_date or ''}",
            f"Subscription Value: {row.subscription_value or ''}",
            f"Pinned Notes: {row.pinned_notes or ''}",
        ]
        content = "\n".join([f for f in fields if f.split(':', 1)[1].strip()])
        if as_metadata:
            return {"status": row.status, "tier": row.tier, "account_manager": row.account_manager}
        return content

    if row.__class__.__name__ == 'Pipeline':
        content = "\n".join([f"Name: {row.name or ''}", f"Description: {row.description or ''}", f"Owner: {row.owner or ''}"])
        if as_metadata:
            return {"name": row.name, "owner": row.owner}
        return content

    if row.__class__.__name__ == 'Phase':
        content = "\n".join([f"Name: {row.name or ''}", f"Creates Client: {row.creates_client or ''}", f"Position: {row.position or ''}"])
        if as_metadata:
            return {"name": row.name, "creates_client": row.creates_client, "position": row.position}
        return content

    if row.__class__.__name__ == 'PipelineAssignment':
        content = f"Departments Config: {row.departments_config or ''}"
        if as_metadata:
            return {"pipeline_id": row.pipeline_id}
        return content

    return ""


def main():
    organization_id = os.getenv("ORGANIZATION_ID", "00000000-0000-0000-0000-000000000000")
    with SessionLocal() as session:
        for model_cls, entity_type, source_table in [
            (Contact, "crm_contact", "contacts"),
            (Activity, "crm_activity", "activities"),
            (Lead, "crm_lead", "leads"),
            (Client, "crm_client", "clients"),
            (Pipeline, "crm_pipeline", "pipelines"),
            (Phase, "crm_phase", "phases"),
            (PipelineAssignment, "crm_pipeline_assignment", "pipeline_assignments"),
        ]:
            rows = session.query(model_cls).all()
            print(f"Indexing {len(rows)} {source_table}")
            index_rows(rows, entity_type, source_table, organization_id, crm_metadata)


if __name__ == "__main__":
    main()
