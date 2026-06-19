from pathlib import Path
import re

BASE = Path('backend/app/modules/accounts')

# Files to modify
mods = {
    'routers.py': BASE / 'routers.py',
    'services.py': BASE / 'services.py',
    'budget_services.py': BASE / 'budget_services.py',
    'reports_services.py': BASE / 'reports_services.py',
    'reports_schemas.py': BASE / 'reports_schemas.py',
}

for name, path in mods.items():
    text = path.read_text(encoding='utf-8')
    orig = text

    if name == 'routers.py':
        text = text.replace("from app.core.tenant import get_current_tenant\n", "")
        text = text.replace(
            'router = APIRouter()\n\n',
            'router = APIRouter()\n\n\n' +
            'def _get_default_tenant_id(db: Session) -> uuid.UUID:\n'
            '    tenant = db.query(Tenant).order_by(Tenant.created_at).first()\n'
            '    if not tenant:\n'
            '        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=\"No Accounts tenant configured.\")\n'
            '    return tenant.id\n\n'
        )
        text = re.sub(
            r'def tenant_dependency\(request: Request\):\n(?:    .*\n)+?\n',
            '',
            text,
            flags=re.MULTILINE,
        )
        text = text.replace('tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db),', 'db: Session = Depends(get_db),')
        text = text.replace('tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)', 'db: Session = Depends(get_db)')
        text = text.replace('tenant: Tenant = Depends(tenant_dependency)', '')

        # Add default tenant id to create routes
        route_defs = [
            'def create_coa_entry(',
            'def create_journal_entry(',
            'def create_expense(',
            'def create_income(',
            'def create_customer(',
            'def create_invoice(',
            'def create_vendor(',
            'def create_bill(',
            'def create_budget(',
            'def create_budget_line(',
        ]
        for sig in route_defs:
            text = text.replace(
                f'{sig}\n    data:',
                f'{sig}\n    data:',
            )

        # Insert default_tenant_id for create routes where needed
        text = text.replace(
            'def create_coa_entry(\n    data: ChartOfAccountCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_coa_entry(\n    data: ChartOfAccountCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_journal_entry(\n    data: JournalEntryCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_journal_entry(\n    data: JournalEntryCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_expense(\n    data: ExpenseCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_expense(\n    data: ExpenseCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_income(\n    data: IncomeCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_income(\n    data: IncomeCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_customer(\n    data: CustomerCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_customer(\n    data: CustomerCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_invoice(\n    data: InvoiceCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_invoice(\n    data: InvoiceCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_vendor(\n    data: VendorCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_vendor(\n    data: VendorCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_bill(\n    data: BillCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_bill(\n    data: BillCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_budget(\n    data: BudgetCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_budget(\n    data: BudgetCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )
        text = text.replace(
            'def create_budget_line(\n    budget_id: int,\n    data: BudgetLineCreate,\n    db: Session = Depends(get_db),\n):\n',
            'def create_budget_line(\n    budget_id: int,\n    data: BudgetLineCreate,\n    db: Session = Depends(get_db),\n):\n    default_tenant_id = _get_default_tenant_id(db)\n'
        )

        text = text.replace('tenant_id=tenant.id,', 'tenant_id=default_tenant_id,')
        text = text.replace('journal = create_invoice_journal(db, tenant.id, invoice)', 'journal = create_invoice_journal(db, invoice.tenant_id, invoice)')
        text = text.replace('journal = create_payment_journal(db, tenant.id, payment, invoice)', 'journal = create_payment_journal(db, payment.tenant_id, payment, invoice)')
        text = text.replace('journal = create_bill_journal(db, tenant.id, bill)', 'journal = create_bill_journal(db, bill.tenant_id, bill)')
        text = text.replace('journal = create_vendor_payment_journal(db, tenant.id, payment, bill)', 'journal = create_vendor_payment_journal(db, payment.tenant_id, payment, bill)')

        # Remove Nile debugging block
        text = re.sub(
            r"    # Log current Nile tenant GUC for debugging\n(?:        .*\n)*?    except Exception:\n        logging\.getLogger\(__name__\)\.exception\("failed to read nile\.tenant_id setting"\)\n\n",
            '',
            text,
            flags=re.MULTILINE,
        )

        # Remove tenant filters from queries
        tenant_filters = [
            'ChartOfAccount.tenant_id == tenant.id,',
            'ChartOfAccount.tenant_id == tenant.id',
            'JournalEntry.tenant_id == tenant.id',
            'JournalLine.tenant_id == tenant.id',
            'LedgerEntry.tenant_id == tenant.id',
            'Expense.tenant_id == tenant.id',
            'Income.tenant_id == tenant.id',
            'Customer.tenant_id == tenant.id',
            'Invoice.tenant_id == tenant.id',
            'Vendor.tenant_id == tenant.id',
            'Bill.tenant_id == tenant.id',
            'Budget.tenant_id == tenant.id',
            'BudgetLine.tenant_id == tenant.id',
        ]
        for f in tenant_filters:
            text = text.replace(f, '')

        # Remove extra commas from empty filter arguments
        text = text.replace('filter(,', 'filter(')
        text = text.replace('filter(  )', 'filter()')
        text = text.replace('filter( )', 'filter()')

        # Replace account validation clause without tenant filtering
        text = text.replace(
            '    valid_accounts = {\n        id for (id,) in db.query(ChartOfAccount.id).filter(\n            ChartOfAccount.tenant_id == tenant.id,\n            ChartOfAccount.id.in_(account_ids),\n        )\n    }\n',
            '    valid_accounts = {\n        id for (id,) in db.query(ChartOfAccount.id).filter(\n            ChartOfAccount.id.in_(account_ids),\n        )\n    }\n'
        )
        # Remove tenant filter from journal queries
        text = text.replace(
            '    journal = (\n        db.query(JournalEntry)\n        .filter(JournalEntry.id == journal_id, JournalEntry.tenant_id == tenant.id)\n        .first()\n    )\n',
            '    journal = (\n        db.query(JournalEntry)\n        .filter(JournalEntry.id == journal_id)\n        .first()\n    )\n'
        )
        text = text.replace(
            '    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.tenant_id == tenant.id).first()\n',
            '    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()\n'
        )
        text = text.replace(
            '    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.tenant_id == tenant.id).first()\n',
            '    bill = db.query(Bill).filter(Bill.id == bill_id).first()\n'
        )
        text = text.replace(
            '    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.tenant_id == tenant.id).first()\n',
            '    budget = db.query(Budget).filter(Budget.id == budget_id).first()\n'
        )
        text = text.replace('    return db.query(Expense).filter(Expense.tenant_id == tenant.id).all()\n', '    return db.query(Expense).all()\n')
        text = text.replace('    return db.query(Income).filter(Income.tenant_id == tenant.id).all()\n', '    return db.query(Income).all()\n')
        text = text.replace('    return db.query(Customer).filter(Customer.tenant_id == tenant.id).all()\n', '    return db.query(Customer).all()\n')
        text = text.replace('    return db.query(Invoice).filter(Invoice.tenant_id == tenant.id).all()\n', '    return db.query(Invoice).all()\n')
        text = text.replace('    return db.query(Vendor).filter(Vendor.tenant_id == tenant.id).all()\n', '    return db.query(Vendor).all()\n')
        text = text.replace('    return db.query(Bill).filter(Bill.tenant_id == tenant.id).all()\n', '    return db.query(Bill).all()\n')
        text = text.replace('    return db.query(Budget).filter(Budget.tenant_id == tenant.id).all()\n', '    return db.query(Budget).all()\n')
        text = text.replace('    return db.query(BudgetLine).filter(BudgetLine.budget_id == budget_id, BudgetLine.tenant_id == tenant.id).all()\n', '    return db.query(BudgetLine).filter(BudgetLine.budget_id == budget_id).all()\n')
        text = text.replace('    return (\n        db.query(ChartOfAccount)\n        .filter(ChartOfAccount.tenant_id == tenant.id)\n        .order_by(ChartOfAccount.account_code)\n        .all()\n    )\n',
            '    return (\n        db.query(ChartOfAccount)\n        .order_by(ChartOfAccount.account_code)\n        .all()\n    )\n'
        )
        text = text.replace('    journals = (\n        db.query(JournalEntry)\n        .filter(JournalEntry.tenant_id == tenant.id)\n        .order_by(JournalEntry.date.desc())\n        .all()\n    )\n',
            '    journals = (\n        db.query(JournalEntry)\n        .order_by(JournalEntry.date.desc())\n        .all()\n    )\n'
        )
        text = text.replace('        all_lines = db.query(JournalLine).filter(\n            JournalLine.journal_id.in_(journal_ids),\n            JournalLine.tenant_id == tenant.id\n        ).all()\n',
            '        all_lines = db.query(JournalLine).filter(\n            JournalLine.journal_id.in_(journal_ids)\n        ).all()\n'
        )
        text = text.replace('    return (\n        db.query(LedgerEntry)\n        .filter(LedgerEntry.tenant_id == tenant.id)\n        .order_by(LedgerEntry.posting_date.desc())\n        .all()\n    )\n',
            '    return (\n        db.query(LedgerEntry)\n        .order_by(LedgerEntry.posting_date.desc())\n        .all()\n    )\n'
        )
        text = text.replace('    journal = (\n        db.query(JournalEntry)\n        .filter(JournalEntry.id == journal_id, JournalEntry.tenant_id == tenant.id)\n        .first()\n    )\n',
            '    journal = (\n        db.query(JournalEntry)\n        .filter(JournalEntry.id == journal_id)\n        .first()\n    )\n'
        )
        text = text.replace('    return db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.tenant_id == tenant.id).first()\n', '    return db.query(Invoice).filter(Invoice.id == invoice_id).first()\n')
        text = text.replace('    return db.query(Bill).filter(Bill.id == bill_id, Bill.tenant_id == tenant.id).first()\n', '    return db.query(Bill).filter(Bill.id == bill_id).first()\n')

    elif name == 'services.py':
        text = text.replace(
            '    existing_codes = {\n        row[0]\n        for row in db.query(ChartOfAccount.account_code)\n        .filter(ChartOfAccount.tenant_id == tenant_id)\n        .all()\n    }\n',
            '    existing_codes = {\n        row[0]\n        for row in db.query(ChartOfAccount.account_code).all()\n    }\n'
        )
        text = text.replace(
            '    lines = db.query(JournalLine).filter(\n        JournalLine.journal_id == journal_entry.id,\n        JournalLine.tenant_id == journal_entry.tenant_id\n    ).all()\n',
            '    lines = db.query(JournalLine).filter(\n        JournalLine.journal_id == journal_entry.id\n    ).all()\n'
        )

    elif name == 'budget_services.py':
        text = text.replace(
            '    ledger_entries = (\n        db.query(func.sum(LedgerEntry.debit).label("total_spent"))\n        .filter(\n            LedgerEntry.account_id == budget_line.account_id,\n            LedgerEntry.tenant_id == budget_line.tenant_id,\n        )\n        .first()\n    )\n',
            '    ledger_entries = (\n        db.query(func.sum(LedgerEntry.debit).label("total_spent"))\n        .filter(\n            LedgerEntry.account_id == budget_line.account_id,\n        )\n        .first()\n    )\n'
        )

    elif name == 'reports_services.py':
        text = text.replace('import uuid\n', '')
        text = text.replace('class TrialBalance:\n    def __init__(self, tenant_id: uuid.UUID):\n        self.tenant_id = tenant_id\n', 'class TrialBalance:\n    def __init__(self):\n        self.accounts: dict = {}\n        self.total_debit = Decimal("0")\n        self.total_credit = Decimal("0")\n        self.is_balanced = False\n')
        text = text.replace(
            '        .filter(LedgerEntry.tenant_id == self.tenant_id)\n',
            '        .filter(\n'
        )
        text = text.replace(
            '        .filter(\n                LedgerEntry.tenant_id == self.tenant_id,\n                ChartOfAccount.account_type == "Revenue",\n            )\n',
            '        .filter(\n                ChartOfAccount.account_type == "Revenue",\n            )\n'
        )
        text = text.replace(
            '        .filter(\n                LedgerEntry.tenant_id == self.tenant_id,\n                ChartOfAccount.account_type == "Expense",\n            )\n',
            '        .filter(\n                ChartOfAccount.account_type == "Expense",\n            )\n'
        )
        text = text.replace(
            '        .filter(\n                LedgerEntry.tenant_id == self.tenant_id,\n                ChartOfAccount.account_type == "Asset",\n            )\n',
            '        .filter(\n                ChartOfAccount.account_type == "Asset",\n            )\n'
        )
        text = text.replace(
            '        .filter(\n                LedgerEntry.tenant_id == self.tenant_id,\n                ChartOfAccount.account_type == "Liability",\n            )\n',
            '        .filter(\n                ChartOfAccount.account_type == "Liability",\n            )\n'
        )
        text = text.replace(
            '        .filter(\n                LedgerEntry.tenant_id == self.tenant_id,\n                ChartOfAccount.account_type == "Equity",\n            )\n',
            '        .filter(\n                ChartOfAccount.account_type == "Equity",\n            )\n'
        )
        text = text = text.replace(
            '        return {\n            "tenant_id": self.tenant_id,\n',
            '        return {\n'
        )
        text = text.replace('class ProfitLoss:\n    def __init__(self, tenant_id: uuid.UUID):\n        self.tenant_id = tenant_id\n', 'class ProfitLoss:\n    def __init__(self):\n        self.revenue = Decimal("0")\n        self.expenses = Decimal("0")\n        self.net_profit = Decimal("0")\n')
        text = text.replace('class BalanceSheet:\n    def __init__(self, tenant_id: uuid.UUID):\n        self.tenant_id = tenant_id\n', 'class BalanceSheet:\n    def __init__(self):\n        self.assets = Decimal("0")\n        self.liabilities = Decimal("0")\n        self.equity = Decimal("0")\n')
        text = text.replace('        return {\n            "tenant_id": self.tenant_id,\n', '        return {\n')

    elif name == 'reports_schemas.py':
        text = text.replace('    tenant_id: uuid.UUID\n', '')

    if text != orig:
        path.write_text(text, encoding='utf-8')
        print(f'Updated {name}')
    else:
        print(f'No changes for {name}')
