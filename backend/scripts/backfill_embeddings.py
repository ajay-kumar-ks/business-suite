"""
backfill_embeddings.py

One-time script to backfill embeddings for ALL existing records
across the accounts module tables.

Usage:
    cd backend
    python scripts/backfill_embeddings.py

    # Dry run (no writes):
    python scripts/backfill_embeddings.py --dry-run

    # Process specific tables only:
    python scripts/backfill_embeddings.py --tables chart_of_accounts,customers,invoices

    # With custom batch size:
    python scripts/backfill_embeddings.py --batch-size 50

Requires:
    - .env file with OPENAI_API_KEY and SUPABASE_DB_URL configured
    - openai, pgvector, sqlalchemy, tenacity packages installed
"""

import os
import sys
import time
import argparse
import logging
from typing import Any, Generator

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Must be set before importing app modules ──
os.environ.setdefault("ENVIRONMENT", "development")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings
from app.modules.accounts.models import (
    ChartOfAccount,
    JournalEntry,
    JournalLine,
    LedgerEntry,
)
from app.modules.accounts.transaction_models import Expense, Income
from app.modules.accounts.ar_models import Customer, Invoice, CustomerPayment
from app.modules.accounts.ap_models import Vendor, Bill, VendorPayment
from app.modules.accounts.budget_models import Budget, BudgetLine

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Configuration ──
OPENAI_API_KEY = settings.OPENAI_API_KEY or settings.OPENROUTER_API_KEY
OPENAI_BASE_URL = settings.OPENROUTER_BASE_URL or "https://api.openai.com/v1"
EMBEDDING_MODEL = settings.OPENAI_EMBEDDING_MODEL
EMBEDDING_DIMENSIONS = settings.OPENAI_EMBEDDING_DIMENSIONS

SUPABASE_DB_URL = settings.SUPABASE_DB_URL or settings.DATABASE_URL

DRY_RUN = False

# ── Table definitions: (model_class, table_name, text_builder_fn) ──

def text_chart_of_accounts(row: ChartOfAccount) -> str:
    return (
        f"Account {row.account_code}: {row.account_name} ({row.account_type})"
    )

def text_journal_entry(row: JournalEntry) -> str:
    return (
        f"Journal {row.reference or 'N/A'}: {row.description or ''}. "
        f"Date: {row.date}. Status: {row.status}."
    )

def text_journal_line(row: JournalLine) -> str:
    return (
        f"Journal Line: {row.memo or 'No memo'} — "
        f"Debit ₹{row.debit}, Credit ₹{row.credit}"
    )

def text_ledger_entry(row: LedgerEntry) -> str:
    return (
        f"Ledger Entry: Account #{row.account_id} — "
        f"Debit ₹{row.debit}, Credit ₹{row.credit} on {row.posting_date}"
    )

def text_expense(row: Expense) -> str:
    return (
        f"Expense: {row.description}. Amount: ₹{row.amount}. "
        f"Date: {row.expense_date}. Status: {row.status}."
    )

def text_income(row: Income) -> str:
    return (
        f"Income: {row.description}. Amount: ₹{row.amount}. "
        f"Date: {row.income_date}. Status: {row.status}."
    )

def text_customer(row: Customer) -> str:
    parts = [f"Customer: {row.name}"]
    if row.email:
        parts.append(f"Email: {row.email}")
    if row.phone:
        parts.append(f"Phone: {row.phone}")
    return ". ".join(parts) + "."

def text_invoice(row: Invoice) -> str:
    return (
        f"Invoice #{row.invoice_number}: ₹{row.amount} "
        f"(Paid: ₹{row.paid_amount}). Status: {row.status}. "
        f"Due: {row.due_date or 'N/A'}."
    )

def text_customer_payment(row: CustomerPayment) -> str:
    return (
        f"Customer Payment: ₹{row.amount} "
        f"(Ref: {row.reference or 'N/A'}). Date: {row.payment_date}."
    )

def text_vendor(row: Vendor) -> str:
    parts = [f"Vendor: {row.name}"]
    if row.email:
        parts.append(f"Email: {row.email}")
    if row.phone:
        parts.append(f"Phone: {row.phone}")
    return ". ".join(parts) + "."

def text_bill(row: Bill) -> str:
    return (
        f"Bill #{row.bill_number}: ₹{row.amount} "
        f"(Paid: ₹{row.paid_amount}). Status: {row.status}. "
        f"Due: {row.due_date or 'N/A'}."
    )

def text_vendor_payment(row: VendorPayment) -> str:
    return (
        f"Vendor Payment: ₹{row.amount} "
        f"(Ref: {row.reference or 'N/A'}). Date: {row.payment_date}."
    )

def text_budget(row: Budget) -> str:
    return (
        f"Budget: {row.name} — FY {row.fiscal_year}, "
        f"Total: ₹{row.total_amount}. Status: {row.status}."
    )

def text_budget_line(row: BudgetLine) -> str:
    return (
        f"Budget Line: Account #{row.account_id} — "
        f"Allocated: ₹{row.allocated_amount}, "
        f"Spent: ₹{row.spent_amount} ({row.consumed_percentage}%)"
    )


# Each entry: (model_class, table_name, text_builder_fn)
TABLE_REGISTRY = [
    (ChartOfAccount,   "chart_of_accounts",   text_chart_of_accounts),
    (JournalEntry,     "journal_entries",     text_journal_entry),
    (JournalLine,      "journal_lines",       text_journal_line),
    (LedgerEntry,      "ledger_entries",       text_ledger_entry),
    (Expense,          "expenses",            text_expense),
    (Income,           "income",              text_income),
    (Customer,         "customers",           text_customer),
    (Invoice,          "invoices",            text_invoice),
    (CustomerPayment,  "customer_payments",   text_customer_payment),
    (Vendor,           "vendors",             text_vendor),
    (Bill,             "bills",               text_bill),
    (VendorPayment,    "vendor_payments",     text_vendor_payment),
    (Budget,           "budgets",             text_budget),
    (BudgetLine,       "budget_lines",        text_budget_line),
]



def get_openai_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY is not configured. "
            "Set OPENAI_API_KEY or OPENROUTER_API_KEY in your .env file."
        )
    return OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
    )


# ── Embedding with retries ──

client: OpenAI | None = None


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type(Exception),
)
def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for a single text string."""
    global client
    if client is None:
        client = get_openai_client()

    resp = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    return resp.data[0].embedding


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type(Exception),
)
def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts."""
    global client
    if client is None:
        client = get_openai_client()

    if not texts:
        return []

    resp = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    # Sort by index to maintain order
    sorted_data = sorted(resp.data, key=lambda x: x.index)
    return [d.embedding for d in sorted_data]


# ── Database helpers ──

def get_db_session() -> Session:
    engine = create_engine(SUPABASE_DB_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def count_unembedded(db: Session, model_class) -> int:
    """Count rows where embedding IS NULL."""
    return db.query(model_class).filter(
        model_class.embedding.is_(None)
    ).count()


def iter_unembedded(
    db: Session, model_class, batch_size: int
) -> Generator[list[Any], None, None]:
    """Yield batches of rows where embedding IS NULL."""
    rows = (
        db.query(model_class)
        .filter(model_class.embedding.is_(None))
        .yield_per(batch_size)
    )
    batch = []
    for row in rows:
        batch.append(row)
        if len(batch) >= batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


# ── Main backfill logic ──

def backfill_table(
    db: Session,
    model_class,
    table_name: str,
    text_fn,
    batch_size: int,
) -> dict:
    """Backfill embeddings for one table. Returns stats dict."""
    total = db.query(model_class).count()
    unembedded = count_unembedded(db, model_class)
    stats = {
        "table": table_name,
        "total_rows": total,
        "unembedded": unembedded,
        "embedded_now": 0,
        "skipped_empty": 0,
        "failed": 0,
    }

    if unembedded == 0:
        logger.info(f"  [{table_name}] All {total} rows already have embeddings. Skipping.")
        return stats

    logger.info(
        f"  [{table_name}] {unembedded}/{total} rows need embeddings"
    )

    batch_texts: list[str] = []
    batch_rows: list[Any] = []

    for batch in iter_unembedded(db, model_class, batch_size):
        for row in batch:
            text = text_fn(row)
            if not text or not text.strip():
                stats["skipped_empty"] += 1
                continue
            batch_texts.append(text)
            batch_rows.append(row)

            if len(batch_texts) >= batch_size:
                _process_batch(db, batch_texts, batch_rows, stats)
                batch_texts.clear()
                batch_rows.clear()

        # Flush remaining
        if batch_texts:
            _process_batch(db, batch_texts, batch_rows, stats)
            batch_texts.clear()
            batch_rows.clear()

    return stats


def _process_batch(
    db: Session,
    texts: list[str],
    rows: list[Any],
    stats: dict,
) -> None:
    """Generate embeddings and update rows in the database."""
    if DRY_RUN:
        logger.info(f"    [DRY RUN] Would embed {len(rows)} rows ({texts[0][:60]}...)")
        stats["embedded_now"] += len(rows)
        return

    try:
        embeddings = generate_embeddings_batch(texts)
    except Exception as e:
        logger.error(f"    Failed to generate embeddings for batch: {e}")
        stats["failed"] += len(texts)
        return

    for row, embedding in zip(rows, embeddings):
        row.embedding = embedding  # type: ignore[attr-defined]

    db.flush()
    stats["embedded_now"] += len(rows)
    logger.info(f"    Embedded {len(rows)} rows (running total: {stats['embedded_now']})")


def print_summary(all_stats: list[dict], dry_run: bool):
    """Print a formatted summary table of results."""
    total_rows = sum(s["total_rows"] for s in all_stats)
    total_embedded = sum(s["embedded_now"] for s in all_stats)
    total_failed = sum(s["failed"] for s in all_stats)
    total_skipped = sum(s["skipped_empty"] for s in all_stats)

    print()
    print("=" * 80)
    print("  BACKFILL SUMMARY")
    print("=" * 80)
    print(f"  {'Table':<25} {'Total':>8} {'Unembedded':>12} {'Embedded':>10} {'Failed':>8} {'Skipped':>8}")
    print("  " + "-" * 71)
    for s in sorted(all_stats, key=lambda x: x["table"]):
        print(
            f"  {s['table']:<25} {s['total_rows']:>8} {s['unembedded']:>12} "
            f"{s['embedded_now']:>10} {s['failed']:>8} {s['skipped_empty']:>8}"
        )
    print("  " + "-" * 71)
    print(f"  {'TOTAL':<25} {total_rows:>8} {'':>12} {total_embedded:>10} {total_failed:>8} {total_skipped:>8}")
    print()
    if dry_run:
        print("  ⚠  DRY RUN — No data was modified. Run without --dry-run to apply.")
    print(f"  Embeddings generated using: {EMBEDDING_MODEL} ({EMBEDDING_DIMENSIONS}d)")
    print(f"  Database: {SUPABASE_DB_URL[:50]}...")
    print("=" * 80)

    if total_failed > 0:
        print(f"\n  ⚠  {total_failed} rows failed. Check logs above for details.")
        print("     Re-run the script to retry failed rows.")


# ── CLI ──

def parse_args():
    parser = argparse.ArgumentParser(
        description="Backfill embeddings for accounts module tables in Supabase"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without writing any data (just count and show what would be done)",
    )
    parser.add_argument(
        "--tables",
        type=str,
        default=None,
        help="Comma-separated list of table names to process (default: all)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=20,
        help="Batch size for embedding generation (default: 20, max: 100 for OpenAI)",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        default=None,
        help="Supabase database URL (overrides settings)",
    )
    parser.add_argument(
        "--skip-openai-check",
        action="store_true",
        help="Skip the OpenAI API key connectivity test",
    )
    return parser.parse_args()


def main():
    global DRY_RUN, client, SUPABASE_DB_URL

    args = parse_args()
    DRY_RUN = args.dry_run

    if args.db_url:
        SUPABASE_DB_URL = args.db_url

    batch_size = min(args.batch_size, 100)  # OpenAI batch limit

    # Validate OpenAI connection
    if not args.skip_openai_check and not DRY_RUN:
        logger.info(f"Checking OpenAI connectivity ({OPENAI_BASE_URL})...")
        try:
            test_client = get_openai_client()
            test_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input="test",
            )
            logger.info("  ✓ OpenAI API is reachable")
        except Exception as e:
            logger.error(f"  ✗ Cannot connect to OpenAI: {e}")
            logger.error("  Set OPENAI_API_KEY in .env or pass --skip-openai-check")
            sys.exit(1)

    # Parse table filter
    table_filter = None
    if args.tables:
        table_filter = {t.strip() for t in args.tables.split(",")}

    # Determine which tables to process
    tables_to_process = TABLE_REGISTRY
    if table_filter:
        tables_to_process = [
            (model, name, text_fn)
            for model, name, text_fn in TABLE_REGISTRY
            if name in table_filter
        ]
        missing = table_filter - {name for _, name, _ in tables_to_process}
        if missing:
            logger.warning(f"Unknown tables requested (skipped): {', '.join(missing)}")

    if not tables_to_process:
        logger.error("No tables to process. Check your --tables argument.")
        sys.exit(1)

    # Print header
    print()
    print("=" * 80)
    if DRY_RUN:
        print("  DRY RUN — No changes will be made")
    print(f"  Backfilling embeddings for {len(tables_to_process)} tables")
    print(f"  Model: {EMBEDDING_MODEL} ({EMBEDDING_DIMENSIONS}d)")
    print(f"  Batch size: {batch_size}")
    print("=" * 80)
    print()

    # Connect to database
    logger.info("Connecting to Supabase database...")
    db = get_db_session()
    logger.info("  ✓ Connected")

    all_stats = []
    start_time = time.time()

    try:
        for model_class, table_name, text_fn in tables_to_process:
            logger.info(f"[{table_name}] Processing...")
            table_start = time.time()
            stats = backfill_table(db, model_class, table_name, text_fn, batch_size)
            elapsed = time.time() - table_start

            if stats["embedded_now"] > 0:
                db.commit()
                logger.info(
                    f"  ✓ {stats['embedded_now']} rows embedded in {elapsed:.1f}s"
                )

            all_stats.append(stats)

        # Final commit
        if not DRY_RUN:
            db.commit()

    except KeyboardInterrupt:
        logger.warning("\nInterrupted. Rolling back current batch...")
        db.rollback()
        logger.info("Rolled back.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

    total_time = time.time() - start_time
    print_summary(all_stats, DRY_RUN)
    print(f"  Total time: {total_time:.1f}s")
    print()


if __name__ == "__main__":
    main()
