from datetime import datetime
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.tenant import get_current_tenant
from app.modules.accounts.models import ChartOfAccount, JournalEntry, JournalLine, LedgerEntry, Tenant
from app.modules.accounts.schemas import (
    ChartOfAccountCreate,
    ChartOfAccountRead,
    JournalEntryCreate,
    JournalEntryRead,
    JournalLineRead,
    JournalStatusUpdate,
    LedgerEntryRead,
    TenantCreate,
    TenantRead,
)
from app.modules.accounts.services import (
    post_journal_entry,
    seed_default_chart_of_accounts,
    validate_journal_lines,
)
from app.modules.accounts.transaction_models import Expense, Income
from app.modules.accounts.transaction_schemas import ExpenseCreate, ExpenseRead, IncomeCreate, IncomeRead
from app.modules.accounts.transaction_services import create_expense_journal, create_income_journal
from app.modules.accounts.ar_models import Customer, Invoice, CustomerPayment
from app.modules.accounts.ar_schemas import (
    CustomerCreate,
    CustomerRead,
    InvoiceCreate,
    InvoiceRead,
    CustomerPaymentCreate,
    CustomerPaymentRead,
)
from app.modules.accounts.ar_services import create_invoice_journal, create_payment_journal
from app.modules.accounts.ap_models import Vendor, Bill, VendorPayment
from app.modules.accounts.ap_schemas import (
    VendorCreate,
    VendorRead,
    BillCreate,
    BillRead,
    VendorPaymentCreate,
    VendorPaymentRead,
)
from app.modules.accounts.ap_services import create_bill_journal, create_vendor_payment_journal
from app.modules.accounts.budget_models import Budget, BudgetLine
from app.modules.accounts.budget_schemas import BudgetCreate, BudgetRead, BudgetLineCreate, BudgetLineRead
from app.modules.accounts.budget_services import calculate_budget_consumption
from app.modules.accounts.reports_services import TrialBalance, ProfitLoss, BalanceSheet
from app.modules.accounts.reports_schemas import TrialBalanceReport, ProfitLossReport, BalanceSheetReport

router = APIRouter()


def tenant_dependency(request: Request):
    try:
        return get_current_tenant(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/")
async def health():
    return {"status": "Accounts module ready"}


@router.post("/tenants", response_model=TenantRead)
def create_tenant(data: TenantCreate, db: Session = Depends(get_db)):
    existing_tenant = db.query(Tenant).filter(Tenant.name == data.name).first()
    if existing_tenant:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant name already exists.")

    tenant = Tenant(name=data.name, status=data.status, is_active=data.is_active)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    seed_default_chart_of_accounts(db, tenant.id)
    return tenant


@router.get("/tenants", response_model=List[TenantRead])
def list_tenants(db: Session = Depends(get_db)):
    return db.query(Tenant).all()


@router.post("/coa", response_model=ChartOfAccountRead)
def create_coa_entry(
    data: ChartOfAccountCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    account = ChartOfAccount(
        tenant_id=tenant.id,
        account_code=data.account_code,
        account_name=data.account_name,
        account_type=data.account_type,
        parent_account_id=data.parent_account_id,
        is_active=data.is_active,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/coa", response_model=List[ChartOfAccountRead])
def list_coa(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return (
        db.query(ChartOfAccount)
        .filter(ChartOfAccount.tenant_id == tenant.id)
        .order_by(ChartOfAccount.account_code)
        .all()
    )


@router.post("/journals", response_model=JournalEntryRead)
def create_journal_entry(
    data: JournalEntryCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    account_ids = [line.account_id for line in data.lines]
    valid_accounts = {
        id for (id,) in db.query(ChartOfAccount.id).filter(
            ChartOfAccount.tenant_id == tenant.id,
            ChartOfAccount.id.in_(account_ids),
        )
    }

    if set(account_ids) != valid_accounts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more journal lines reference accounts that do not belong to the tenant.",
        )

    journal = JournalEntry(
        tenant_id=tenant.id,
        reference=data.reference,
        description=data.description,
        status="draft",
        date=data.date or datetime.utcnow(),
    )

    for line_data in data.lines:
        journal_line = JournalLine(
            account_id=line_data.account_id,
            memo=line_data.memo,
            debit=Decimal(str(line_data.debit)),
            credit=Decimal(str(line_data.credit)),
        )
        journal.lines.append(journal_line)

    validate_journal_lines(journal.lines)

    db.add(journal)
    db.commit()
    db.refresh(journal)
    return journal


@router.get("/journals", response_model=List[JournalEntryRead])
def list_journal_entries(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return (
        db.query(JournalEntry)
        .filter(JournalEntry.tenant_id == tenant.id)
        .order_by(JournalEntry.date.desc())
        .all()
    )


@router.post("/journals/{journal_id}/submit", response_model=JournalEntryRead)
def submit_journal_entry(
    journal_id: int,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    journal = (
        db.query(JournalEntry)
        .filter(JournalEntry.id == journal_id, JournalEntry.tenant_id == tenant.id)
        .first()
    )
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found.")
    if journal.status != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft journals can be submitted.")
    journal.status = "submitted"
    journal.submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(journal)
    return journal


@router.post("/journals/{journal_id}/approve", response_model=JournalEntryRead)
def approve_journal_entry(
    journal_id: int,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    journal = (
        db.query(JournalEntry)
        .filter(JournalEntry.id == journal_id, JournalEntry.tenant_id == tenant.id)
        .first()
    )
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found.")
    if journal.status != "submitted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted journals can be approved.")
    journal.status = "approved"
    journal.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(journal)
    return journal


@router.post("/journals/{journal_id}/post", response_model=JournalEntryRead)
def post_journal_entry_endpoint(
    journal_id: int,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    journal = (
        db.query(JournalEntry)
        .filter(JournalEntry.id == journal_id, JournalEntry.tenant_id == tenant.id)
        .first()
    )
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found.")

    try:
        posted = post_journal_entry(db, journal)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return posted


@router.get("/ledger", response_model=List[LedgerEntryRead])
def list_ledger_entries(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return (
        db.query(LedgerEntry)
        .filter(LedgerEntry.tenant_id == tenant.id)
        .order_by(LedgerEntry.posting_date.desc())
        .all()
    )


@router.get("/journals/{journal_id}", response_model=JournalEntryRead)
def get_journal_entry(journal_id: int, tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    journal = (
        db.query(JournalEntry)
        .filter(JournalEntry.id == journal_id, JournalEntry.tenant_id == tenant.id)
        .first()
    )
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found.")
    return journal


# ===== TRANSACTION LAYER =====


@router.post("/expenses", response_model=ExpenseRead)
def create_expense(
    data: ExpenseCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    expense = Expense(
        tenant_id=tenant.id,
        description=data.description,
        amount=Decimal(str(data.amount)),
        expense_date=data.expense_date or datetime.utcnow(),
        account_id=data.account_id,
        reference=data.reference,
        status="draft",
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    journal = create_expense_journal(db, expense)
    expense.journal_id = journal.id
    db.commit()
    db.refresh(expense)

    return expense


@router.get("/expenses", response_model=List[ExpenseRead])
def list_expenses(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return db.query(Expense).filter(Expense.tenant_id == tenant.id).all()


@router.post("/income", response_model=IncomeRead)
def create_income(
    data: IncomeCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    income = Income(
        tenant_id=tenant.id,
        description=data.description,
        amount=Decimal(str(data.amount)),
        income_date=data.income_date or datetime.utcnow(),
        account_id=data.account_id,
        reference=data.reference,
        status="draft",
    )
    db.add(income)
    db.commit()
    db.refresh(income)

    journal = create_income_journal(db, income)
    income.journal_id = journal.id
    db.commit()
    db.refresh(income)

    return income


@router.get("/income", response_model=List[IncomeRead])
def list_income(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return db.query(Income).filter(Income.tenant_id == tenant.id).all()


# ===== ACCOUNTS RECEIVABLE =====


@router.post("/customers", response_model=CustomerRead)
def create_customer(
    data: CustomerCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    customer = Customer(
        tenant_id=tenant.id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        address=data.address,
        is_active=data.is_active,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers", response_model=List[CustomerRead])
def list_customers(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return db.query(Customer).filter(Customer.tenant_id == tenant.id).all()


@router.post("/invoices", response_model=InvoiceRead)
def create_invoice(
    data: InvoiceCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    invoice = Invoice(
        tenant_id=tenant.id,
        customer_id=data.customer_id,
        invoice_number=data.invoice_number,
        invoice_date=data.invoice_date or datetime.utcnow(),
        due_date=data.due_date,
        amount=Decimal(str(data.amount)),
        paid_amount=Decimal("0"),
        status="draft",
        description=data.description,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    journal = create_invoice_journal(db, tenant.id, invoice)
    invoice.journal_id = journal.id
    db.commit()
    db.refresh(invoice)

    return invoice


@router.get("/invoices", response_model=List[InvoiceRead])
def list_invoices(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return db.query(Invoice).filter(Invoice.tenant_id == tenant.id).all()


@router.post("/invoices/{invoice_id}/payments", response_model=CustomerPaymentRead)
def create_customer_payment(
    invoice_id: int,
    data: CustomerPaymentCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.tenant_id == tenant.id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

    payment = CustomerPayment(
        tenant_id=tenant.id,
        invoice_id=invoice_id,
        payment_date=data.payment_date or datetime.utcnow(),
        amount=Decimal(str(data.amount)),
        reference=data.reference,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    journal = create_payment_journal(db, tenant.id, payment, invoice)
    payment.journal_id = journal.id

    invoice.paid_amount += Decimal(str(data.amount))
    if invoice.paid_amount >= invoice.amount:
        invoice.status = "paid"

    db.commit()
    db.refresh(payment)

    return payment


# ===== ACCOUNTS PAYABLE =====


@router.post("/vendors", response_model=VendorRead)
def create_vendor(
    data: VendorCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    vendor = Vendor(
        tenant_id=tenant.id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        address=data.address,
        is_active=data.is_active,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/vendors", response_model=List[VendorRead])
def list_vendors(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return db.query(Vendor).filter(Vendor.tenant_id == tenant.id).all()


@router.post("/bills", response_model=BillRead)
def create_bill(
    data: BillCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    bill = Bill(
        tenant_id=tenant.id,
        vendor_id=data.vendor_id,
        bill_number=data.bill_number,
        bill_date=data.bill_date or datetime.utcnow(),
        due_date=data.due_date,
        amount=Decimal(str(data.amount)),
        paid_amount=Decimal("0"),
        status="draft",
        description=data.description,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)

    journal = create_bill_journal(db, tenant.id, bill)
    bill.journal_id = journal.id
    db.commit()
    db.refresh(bill)

    return bill


@router.get("/bills", response_model=List[BillRead])
def list_bills(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return db.query(Bill).filter(Bill.tenant_id == tenant.id).all()


@router.post("/bills/{bill_id}/payments", response_model=VendorPaymentRead)
def create_vendor_payment(
    bill_id: int,
    data: VendorPaymentCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.tenant_id == tenant.id).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found.")

    payment = VendorPayment(
        tenant_id=tenant.id,
        bill_id=bill_id,
        payment_date=data.payment_date or datetime.utcnow(),
        amount=Decimal(str(data.amount)),
        reference=data.reference,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    journal = create_vendor_payment_journal(db, tenant.id, payment, bill)
    payment.journal_id = journal.id

    bill.paid_amount += Decimal(str(data.amount))
    if bill.paid_amount >= bill.amount:
        bill.status = "paid"

    db.commit()
    db.refresh(payment)

    return payment


# ===== BUDGET MANAGEMENT =====


@router.post("/budgets", response_model=BudgetRead)
def create_budget(
    data: BudgetCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    budget = Budget(
        tenant_id=tenant.id,
        name=data.name,
        fiscal_year=data.fiscal_year,
        total_amount=Decimal(str(data.total_amount)),
        status=data.status,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.get("/budgets", response_model=List[BudgetRead])
def list_budgets(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    return db.query(Budget).filter(Budget.tenant_id == tenant.id).all()


@router.post("/budgets/{budget_id}/lines", response_model=BudgetLineRead)
def create_budget_line(
    budget_id: int,
    data: BudgetLineCreate,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.tenant_id == tenant.id).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")

    budget_line = BudgetLine(
        budget_id=budget_id,
        tenant_id=tenant.id,
        account_id=data.account_id,
        allocated_amount=Decimal(str(data.allocated_amount)),
        spent_amount=Decimal("0"),
        consumed_percentage=Decimal("0"),
    )
    db.add(budget_line)
    db.commit()
    db.refresh(budget_line)

    calculate_budget_consumption(db, budget_line)

    return budget_line


@router.get("/budgets/{budget_id}/lines", response_model=List[BudgetLineRead])
def list_budget_lines(
    budget_id: int,
    tenant: Tenant = Depends(tenant_dependency),
    db: Session = Depends(get_db),
):
    return db.query(BudgetLine).filter(BudgetLine.budget_id == budget_id, BudgetLine.tenant_id == tenant.id).all()


# ===== FINANCIAL REPORTS =====


@router.get("/reports/trial-balance", response_model=TrialBalanceReport)
def trial_balance_report(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    tb = TrialBalance(tenant.id)
    return tb.generate(db)


@router.get("/reports/profit-loss", response_model=ProfitLossReport)
def profit_loss_report(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    pl = ProfitLoss(tenant.id)
    return pl.generate(db)


@router.get("/reports/balance-sheet", response_model=BalanceSheetReport)
def balance_sheet_report(tenant: Tenant = Depends(tenant_dependency), db: Session = Depends(get_db)):
    bs = BalanceSheet(tenant.id)
    return bs.generate(db)
