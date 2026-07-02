import logging
import uuid
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.accounts.ar_models import Customer, Invoice
from app.modules.accounts.ap_models import Vendor, Bill
from app.modules.accounts.budget_models import Budget, BudgetLine
from app.modules.accounts.models import ChartOfAccount, JournalEntry, JournalLine, LedgerEntry
from app.modules.accounts.transaction_models import Expense, Income
from app.services.vector.chunking import chunk_document
from app.services.vector.embedding_service import EmbeddingService
from app.services.vector.search_service import VectorSearchService

logger = logging.getLogger(__name__)


def build_entity_type(name: str) -> str:
    normalized = name.strip().lower()
    if normalized.endswith("ies"):
        normalized = normalized[:-3] + "y"
    elif normalized.endswith("s") and not normalized.endswith("ss"):
        normalized = normalized[:-1]
    return f"accounts_{normalized}"


def build_document_id(source_table: str, entity_id: Any, chunk_index: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{source_table}:{entity_id}:{chunk_index}"))


def clear_legacy_accounts_rows(db: Session) -> None:
    legacy_rows = db.query(ChartOfAccount).count()
    if legacy_rows:
        db.execute(
            text("DELETE FROM search_documents WHERE entity_type = :entity_type"),
            {"entity_type": "accounts"},
        )
        db.commit()


def coerce_uuid(value: Any, prefix: str) -> uuid.UUID:
    if isinstance(value, uuid.UUID):
        return value
    if value is None:
        return uuid.uuid4()
    if isinstance(value, int):
        return uuid.uuid5(uuid.NAMESPACE_DNS, f"{prefix}:{value}")
    if isinstance(value, str):
        try:
            return uuid.UUID(value)
        except ValueError:
            return uuid.uuid5(uuid.NAMESPACE_DNS, f"{prefix}:{value}")
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"{prefix}:{value}")


def _build_accounts_documents(db: Session) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    for account in db.query(ChartOfAccount).all():
        content = "\n".join([
            f"Account: {account.account_name}",
            f"Code: {account.account_code}",
            f"Type: {account.account_type}",
            f"Status: {'active' if account.is_active else 'inactive'}",
        ])
        rows.append({
            "organization_id": coerce_uuid(settings.DATABASE_NAME, "organization"),
            "entity_type": build_entity_type("chart_of_account"),
            "entity_id": coerce_uuid(f"chart_of_account:{account.id}", "entity"),
            "source_table": "chart_of_accounts",
            "source_field": "content",
            "content": content,
            "metadata": {
                "source_table": "chart_of_accounts",
                "entity_name": account.account_name,
                "account_type": account.account_type,
            },
        })

    for journal in db.query(JournalEntry).all():
        lines = db.query(JournalLine).filter(JournalLine.journal_id == journal.id).all()
        line_text = " | ".join(
            f"{line.account_id}:{line.debit}/{line.credit}:{line.memo or ''}" for line in lines
        )
        content = "\n".join([
            f"Journal Entry: {journal.reference or journal.id}",
            f"Description: {journal.description or ''}",
            f"Status: {journal.status}",
            f"Date: {journal.date.isoformat() if journal.date else ''}",
            f"Lines: {line_text}",
        ])
        rows.append({
            "organization_id": coerce_uuid(settings.DATABASE_NAME, "organization"),
            "entity_type": build_entity_type("journal_entry"),
            "entity_id": coerce_uuid(f"journal_entry:{journal.id}", "entity"),
            "source_table": "journal_entries",
            "source_field": "content",
            "content": content,
            "metadata": {
                "source_table": "journal_entries",
                "journal_status": journal.status,
            },
        })

    for invoice in db.query(Invoice).all():
        customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
        content = "\n".join([
            f"Invoice: {invoice.invoice_number}",
            f"Customer: {customer.name if customer else 'Unknown'}",
            f"Amount: {invoice.amount}",
            f"Paid: {invoice.paid_amount}",
            f"Status: {invoice.status}",
            f"Due: {invoice.due_date.isoformat() if invoice.due_date else ''}",
            f"Description: {invoice.description or ''}",
        ])
        rows.append({
            "organization_id": coerce_uuid(settings.DATABASE_NAME, "organization"),
            "entity_type": build_entity_type("invoice"),
            "entity_id": coerce_uuid(f"invoice:{invoice.id}", "entity"),
            "source_table": "invoices",
            "source_field": "content",
            "content": content,
            "metadata": {
                "source_table": "invoices",
                "invoice_status": invoice.status,
            },
        })

    for bill in db.query(Bill).all():
        vendor = db.query(Vendor).filter(Vendor.id == bill.vendor_id).first()
        content = "\n".join([
            f"Bill: {bill.bill_number}",
            f"Vendor: {vendor.name if vendor else 'Unknown'}",
            f"Amount: {bill.amount}",
            f"Paid: {bill.paid_amount}",
            f"Status: {bill.status}",
            f"Due: {bill.due_date.isoformat() if bill.due_date else ''}",
            f"Description: {bill.description or ''}",
        ])
        rows.append({
            "organization_id": coerce_uuid(settings.DATABASE_NAME, "organization"),
            "entity_type": build_entity_type("bill"),
            "entity_id": coerce_uuid(f"bill:{bill.id}", "entity"),
            "source_table": "bills",
            "source_field": "content",
            "content": content,
            "metadata": {
                "source_table": "bills",
                "bill_status": bill.status,
            },
        })

    for budget in db.query(Budget).all():
        lines = db.query(BudgetLine).filter(BudgetLine.budget_id == budget.id).all()
        line_text = " | ".join(
            f"{line.account_id}:{line.allocated_amount}/{line.spent_amount}" for line in lines
        )
        content = "\n".join([
            f"Budget: {budget.name}",
            f"Fiscal Year: {budget.fiscal_year}",
            f"Total Amount: {budget.total_amount}",
            f"Status: {budget.status}",
            f"Lines: {line_text}",
        ])
        rows.append({
            "organization_id": coerce_uuid(settings.DATABASE_NAME, "organization"),
            "entity_type": build_entity_type("budget"),
            "entity_id": coerce_uuid(f"budget:{budget.id}", "entity"),
            "source_table": "budgets",
            "source_field": "content",
            "content": content,
            "metadata": {
                "source_table": "budgets",
                "budget_status": budget.status,
            },
        })

    for expense in db.query(Expense).all():
        content = "\n".join([
            f"Expense: {expense.description}",
            f"Amount: {expense.amount}",
            f"Date: {expense.expense_date.isoformat() if expense.expense_date else ''}",
            f"Status: {expense.status}",
            f"Account: {expense.account_id}",
        ])
        rows.append({
            "organization_id": coerce_uuid(settings.DATABASE_NAME, "organization"),
            "entity_type": build_entity_type("expense"),
            "entity_id": coerce_uuid(f"expense:{expense.id}", "entity"),
            "source_table": "expenses",
            "source_field": "content",
            "content": content,
            "metadata": {
                "source_table": "expenses",
                "expense_status": expense.status,
            },
        })

    for income in db.query(Income).all():
        content = "\n".join([
            f"Income: {income.description}",
            f"Amount: {income.amount}",
            f"Date: {income.income_date.isoformat() if income.income_date else ''}",
            f"Status: {income.status}",
            f"Account: {income.account_id}",
        ])
        rows.append({
            "organization_id": coerce_uuid(settings.DATABASE_NAME, "organization"),
            "entity_type": build_entity_type("income"),
            "entity_id": coerce_uuid(f"income:{income.id}", "entity"),
            "source_table": "income",
            "source_field": "content",
            "content": content,
            "metadata": {
                "source_table": "income",
                "income_status": income.status,
            },
        })

    return rows


def index_accounts_documents(db: Session) -> int:
    clear_legacy_accounts_rows(db)
    rows = _build_accounts_documents(db)
    if not rows:
        return 0

    embedding_service = EmbeddingService(
        api_key=settings.ACCOUNTS_OPENROUTER_API_KEY or settings.OPENROUTER_API_KEY,
        base_url=settings.OPENROUTER_BASE_URL,
    )
    vector_service = VectorSearchService()

    indexed = 0
    for row in rows:
        content = row.get("content") or ""
        chunks = chunk_document(content, max_tokens=700, overlap_tokens=100)
        if not chunks:
            continue
        embeddings = embedding_service.embed_texts(chunks)
        chunk_rows = []
        for idx, chunk in enumerate(chunks):
            chunk_rows.append({
                "id": build_document_id(row["source_table"], row["entity_id"], idx),
                "organization_id": row["organization_id"],
                "entity_type": row["entity_type"],
                "entity_id": row["entity_id"],
                "source_table": row["source_table"],
                "source_field": row["source_field"],
                "chunk_index": idx,
                "chunk_type": "semantic",
                "content": chunk,
                "metadata": {
                    **row.get("metadata", {}),
                    "embedding_model": settings.EMBEDDING_MODEL,
                },
                "embedding": embeddings[idx],
            })
        vector_service.store_embeddings(chunk_rows)
        indexed += len(chunk_rows)

    return indexed
