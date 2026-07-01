from sqlalchemy.orm import Session
from app.modules.accounts.models import ChartOfAccount


def get_account_id_by_code(db: Session, code: str) -> int:
    """Look up a Chart of Account ID by its account code."""
    account = db.query(ChartOfAccount.id).filter(ChartOfAccount.account_code == code).first()
    if account:
        return account[0]
    raise ValueError(f"No account found with code '{code}' in the chart of accounts.")


def get_cash_account_id(db: Session) -> int:
    """Look up Cash account ID, falling back to Bank then any Asset account."""
    for code in ("1000", "1100"):
        account = db.query(ChartOfAccount.id).filter(ChartOfAccount.account_code == code).first()
        if account:
            return account[0]

    account = db.query(ChartOfAccount.id).filter(ChartOfAccount.account_type.ilike("asset")).first()
    if account:
        return account[0]

    raise ValueError("No cash or asset account found in the chart of accounts.")
