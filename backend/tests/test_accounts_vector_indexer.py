from uuid import UUID

from sqlalchemy import text

from app.modules.accounts.vector_indexer import coerce_uuid, build_entity_type
from app.services.vector.search_service import VectorSearchService


class FakeSession:
    def __init__(self, *args, **kwargs):
        self.executed = None

    def execute(self, statement, params=None):
        self.executed = (statement, params)
        return type("Result", (), {"fetchall": lambda self: []})()

    def commit(self):
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def test_coerce_uuid_returns_uuid_values():
    organization_id = coerce_uuid("business_suite_db", "organization")
    entity_id = coerce_uuid("chart_of_account:1", "entity")

    assert isinstance(organization_id, UUID)
    assert isinstance(entity_id, UUID)
    assert str(organization_id) != "business_suite_db"
    assert str(entity_id) != "chart_of_account:1"


def test_build_entity_type_uses_accounts_prefix():
    assert build_entity_type("chart_of_accounts") == "accounts_chart_of_account"
    assert build_entity_type("journal_entries") == "accounts_journal_entry"
    assert build_entity_type("invoices") == "accounts_invoice"


def test_search_service_uses_cast_for_vector_query(monkeypatch):
    session = FakeSession()

    monkeypatch.setattr("app.services.vector.embedding_service.EmbeddingService.embed_texts", lambda self, texts: [[0.1, 0.2, 0.3]])

    service = VectorSearchService(session_factory=lambda: session)
    service.search_similar("cash account", limit=3)

    statement, params = session.executed
    rendered = str(statement)
    assert "CAST(:query AS vector)" in rendered
    assert params["query"][:3] == [0.1, 0.2, 0.3]
