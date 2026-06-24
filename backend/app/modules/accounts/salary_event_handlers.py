from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.event_bus import event_bus
from app.core.database import SessionLocal
from app.modules.accounts.models import ChartOfAccount, JournalEntry, JournalLine
from app.modules.accounts.services import post_journal_entry


def _get_account_id_by_code(db: Session, account_code: str) -> int:
    row = db.query(ChartOfAccount.id).filter(ChartOfAccount.account_code == account_code).first()
    if not row:
        raise ValueError(f"COA account not found for code={account_code}")
    return row[0]


def _build_salary_journal_lines(*, expense_account_id: int, cash_account_id: int, amount: Decimal) -> list[JournalLine]:
    return [
        JournalLine(
            journal_id=0,  # temporary; will be replaced after JournalEntry flush
            account_id=expense_account_id,
            memo="Payroll expense",
            debit=amount,
            credit=Decimal("0"),
        ),
        JournalLine(
            journal_id=0,  # temporary; will be replaced after JournalEntry flush
            account_id=cash_account_id,
            memo="Cash payment for payroll",
            debit=Decimal("0"),
            credit=amount,
        ),
    ]


def handle_salary_processed(payload: dict) -> None:
    """Convert HR salary event into an Accounts expense journal and post to ledger.

    Expected payload fields (from HR):
      - employee_id (optional)
      - employee_code/name (optional)
      - amount (number)
      - reference (optional)
      - timestamp (optional)
    """
    db: Session = SessionLocal()
    try:
        amount_raw = payload.get("amount")
        if amount_raw is None:
            return

        amount = Decimal(str(amount_raw))
        if amount <= 0:
            return

        expense_account_id = _get_account_id_by_code(db, "5000")  # Expenses
        # Try cash 1000 first, then bank 1100
        cash_account_id = None
        for code in ("1000", "1100"):
            try:
                cash_account_id = _get_account_id_by_code(db, code)
                break
            except ValueError:
                continue
        if cash_account_id is None:
            raise ValueError("Neither Cash (1000) nor Bank (1100) account found in COA.")

        when = payload.get("timestamp")
        journal_date = datetime.fromisoformat(when) if when else datetime.utcnow()

        journal_ref = payload.get("reference") or f"SAL-{payload.get('employee_id') or 'EMP'}-{int(journal_date.timestamp())}"

        journal = JournalEntry(
            reference=journal_ref,
            description="Payroll salary expense",
            status="approved",  # will be posted immediately
            date=journal_date,
        )
        db.add(journal)
        db.flush()  # assigns journal.id

        expense_line = JournalLine(
            journal_id=journal.id,
            account_id=expense_account_id,
            memo="Payroll expense",
            debit=amount,
            credit=Decimal("0"),
        )
        cash_line = JournalLine(
            journal_id=journal.id,
            account_id=cash_account_id,
            memo="Cash payment for payroll",
            debit=Decimal("0"),
            credit=amount,
        )
        db.add(expense_line)
        db.add(cash_line)
        db.flush()

        # Post (creates ledger entries)
        post_journal_entry(db, journal)
        db.commit()

        event_bus.publish(
            "salary.paid",
            {
                "salary_event_reference": journal_ref,
                "journal_id": journal.id,
                "amount": float(amount),
                "currency": payload.get("currency"),
            },
        )
    except Exception as exc:
        # Do not crash the event bus; allow HR save to succeed.
        db.rollback()
        print(f"[salary_event_handler] Error processing salary: {exc}")
    finally:
        db.close()


def register_salary_event_handlers() -> None:
    event_bus.subscribe("salary.processed", handle_salary_processed)

