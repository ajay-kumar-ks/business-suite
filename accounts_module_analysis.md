# Business Suite ERP — Accounts Module Analysis

> **Date:** July 2, 2026
> **Scope:** Full analysis of the single-company ERP application with deep focus on the Accounts module (owned by you)
> **Other modules (owned by others):** Auth, Tasks, HR, CRM, Recruitment, Payments

---

## 1. OVERALL ERP APPLICATION STRUCTURE

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (async Python) + SQLAlchemy ORM + PostgreSQL |
| **Frontend** | React 18 + Vite + Axios |
| **Database** | PostgreSQL hosted on Supabase |
| **Event System** | In-memory event bus with persistent event store (`event_store` table) |
| **Vector/AI** | OpenAI `text-embedding-3-small` → pgvector indexes → RAG chatbot + AI Insights |
| **Payments** | Razorpay integration |

### Module Map

| Module | Route Prefix | Owner | Purpose |
|--------|-------------|-------|---------|
| **Accounts** | `/api/accounts` | **YOU** | Financial engine — double-entry accounting, AR/AP, budgets, reports |
| Auth | `/api/auth` | Other | JWT login, user management, permissions |
| Tasks | `/api/tasks` | Other | Task management with scheduler |
| HR | `/api/hr` | Other | Employee profiles, HR operations |
| CRM | `/api/crm` | Other | Leads, pipelines, clients |
| Recruitment | `/api/recruitment` | Other | Candidates, hiring pipelines |
| Payments | `/api/payments` | Other | Razorpay payment processing |

Each module is fully self-contained under `backend/app/modules/<module_name>/` with its own models, schemas, routers, and services. Modules communicate via the **event bus** (`app/core/event_bus.py`).

### Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                              │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Auth     │ │ HR       │ │ Tasks    │ │ CRM      │          │
│  │ Module   │ │ Module   │ │ Module   │ │ Module   │          │
│  └──────────┘ └─────┬────┘ └──────────┘ └──────────┘          │
│                      │                                         │
│         Event Bus (core/event_bus.py)                          │
│                      │                                         │
│  ┌───────────────────▼──────────────────────────────────────┐  │
│  │                ACCOUNTS MODULE                             │  │
│  │  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ COA      │  │ Journals│  │ Ledger   │  │ Reports  │  │  │
│  │  │ (models) │  │ (engine)│  │(immutable)│  │ (TB/P&L)│  │  │
│  │  └──────────┘  └─────────┘  └──────────┘  └──────────┘  │  │
│  │  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ AR/AP    │  │ Budgets │  │ AI Chat  │  │ Insights │  │  │
│  │  │ (Inv/Bill)│  │(Tracking)│  │ (RAG)   │  │ (LLM)   │  │  │
│  │  └──────────┘  └─────────┘  └──────────┘  └──────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Database (Supabase PostgreSQL + pgvector)              │    │
│  │  accounts_* tables  │  event_store  │  search_documents │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. HOW THE ACCOUNTS MODULE IS **SUPPOSED** TO WORK (Design Intent)

The design intent is documented in `Acc.md` and `Implementation_plan.md`. It is a **proper double-entry accounting system** modeled after Zoho Books, NetSuite, Odoo, and ERPNext.

### Core Accounting Principle

```
Every transaction must satisfy: Total Debits = Total Credits
```

### The Complete Financial Data Pipeline

```
Business Event (sale, purchase, expense, payroll)
         │
         ▼
     Journal Entry (draft → submitted → approved → posted)
         │
         ▼
     General Ledger (immutable entries — never edited/deleted)
         │
         ▼
     Trial Balance (verifies Debits = Credits)
         │
         ▼
     Financial Reports (P&L, Balance Sheet, Cash Flow)
```

### 10 Phases of Designed Functionality

| Phase | Component | Purpose |
|-------|-----------|---------|
| **1** | Multi-Tenant Foundation | Tenant isolation via `X-Tenant-ID` header (now single-company) |
| **2** | Event Bus Infrastructure | All financial actions publish events → recorded in `event_store` |
| **3** | Chart of Accounts | 8 default accounts seeded per company |
| **4** | Double-Entry Engine | Journal → Submit → Approve → Post workflow with debit=credit validation |
| **5** | General Ledger | Immutable ledger entries created from posted journals |
| **6** | Transaction Layer | Expenses (Dr Expense, Cr Cash) and Income (Dr Cash, Cr Income) auto-generate journals |
| **7** | Accounts Receivable | Invoices (Dr AR, Cr Revenue). Payments (Dr Cash, Cr AR). Paid/unpaid tracking |
| **8** | Accounts Payable | Bills (Dr Expense, Cr AP). Payments (Dr AP, Cr Cash). Paid/unpaid tracking |
| **9** | Budget Management | Budget → allocate per account → consumption from ledger |
| **10** | Financial Reports | Trial Balance, P&L, Balance Sheet — all generated **live** from ledger |

### Intended User Permissions

| User | Pages | Actions |
|------|-------|---------|
| **Admin** | All 10 pages | Everything |
| **Finance** | All 10 pages | Everything |
| **HR** | Overview, Budgets | Create/manage budgets |
| **Marketing** | Overview, Transactions, Budgets | Create expenses, manage budgets |
| **Operations** | Overview, Transactions, Budgets | Create expenses, manage budgets |
| **Sales** | Overview, AR | Create customers, create invoices |
| **IT** | Overview, Transactions, Budgets | Create expenses, manage budgets |
| **Unknown** | Overview only | Nothing |

---

## 3. HOW IT IS **ACTUALLY** WORKING (Implementation Reality)

### ✅ Fully Implemented and Working

| Feature | Status | Details |
|---------|--------|---------|
| **Chart of Accounts** | ✅ Solid | 8 default accounts auto-seeded at startup. Full CRUD via API and frontend |
| **Journal Lifecycle** | ✅ Solid | Draft → Submit → Approve → Post. Debit = Credit validation enforced |
| **Ledger Immutability** | ✅ Solid | Posted entries never edited/deleted. RESTRICT constraint in place |
| **Auto-Journal Generation** | ✅ Solid | Expenses, income, invoices, bills, payments all generate correct double-entry journals |
| **AR/AP with Payment Tracking** | ✅ Solid | `paid_amount` vs `amount` tracked. Status flips to "paid" automatically |
| **Budget Consumption** | ✅ Solid | Calculated from ledger in real-time. `budget.exceeded` event at > 100% |
| **Trial Balance Report** | ✅ Solid | Sums debits/credits by account from ledger. Validates balance |
| **Profit & Loss Report** | ✅ Solid | Revenue - Expenses = Net Profit from ledger |
| **Balance Sheet Report** | ✅ Solid | Assets = Liabilities + Equity validation |
| **Event Bus / Audit Trail** | ✅ Solid | 11 event types published + recorded in `event_store` table |
| **Salary Integration** | ✅ Solid | `salary_event_handlers.py` listens for HR events: accrual (Dr Expense, Cr Payable) then payment (Dr Payable, Cr Cash) |
| **AI Chatbot** | ✅ Works | RAG pipeline: vector search → context → GPT-4o-mini answer |
| **AI Insights** | ✅ Works | LLM-generated financial analysis from current metrics |
| **Department Permissions** | ✅ Works | Context-based `useAccountsPermissions()` hook enforced on all pages |
| **Frontend Pages** | ✅ All 10 | Overview, COA, Journals, Ledger, Transactions, AR, AP, Budgets, Reports, AI Insights |

### ⚠️ Working But Has Gaps

| Feature | Status | The Gap |
|---------|--------|---------|
| **Multi-Tenant** | ⚠️ Vestigial | Converted to single-company mode. `tenant_id` columns still exist everywhere but always hold the same default UUID. Old `/tenants` endpoints deleted. Dead tenant logic remains |
| **Transaction Journals** | ⚠️ Never Posted | Expenses and income auto-generate journals in **draft** status. No UI or backend mechanism to submit/approve/post them. They sit in draft forever |
| **Invoice/Bill Journals** | ⚠️ Never Posted | Same as expenses — auto-generated journals stay in draft. Invoices created as `draft`, never auto-posted |
| **Budget Consumption** | ⚠️ Stale | Only recalculated when budget lines are added. New expenses/journals don't trigger recalculation |
| **Reports** | ⚠️ Limited | No drill-down from report summary to detail entries. No Cash Flow Statement |
| **Reversal Entries** | ⚠️ No UI | No UI for creating reversal entries (flip debits and credits to correct mistakes) |
| **Vector Indexing** | ⚠️ Manual | `POST /ai/index-documents` must be called manually. No event-driven auto-embedding sync |
| **Salary Events** | ⚠️ Basic | Only handles basic accrual → payment. No tax withholding, no payroll deductions |
| **Closing Process** | ⚠️ Missing | No month-end close, no period locking, no fiscal year management |

### ❌ Notable Issues

1. **Dead tenant code:** Models still have `tenant_id` columns but they always hold the same default tenant UUID since the single-company conversion. Creates confusion.

2. **Auto-journals stuck in draft forever:** When you create an expense, the journal `create_expense_journal()` generates is set to `draft`. There's **no automated or user-initiated pipeline** to submit → approve → post it. Same for income, invoices, and bills. The transaction sits in `draft` status indefinitely.

3. **No Cash Flow Statement:** One of the three core financial statements (P&L, Balance Sheet, Cash Flow) is missing. `Acc.md` includes it in the design.

4. **No Aged AR/AP reports:** Standard accounting reports showing aging buckets (0-30, 31-60, 61-90, 90+ days) for outstanding receivables and payables are not implemented.

5. **No corrections/reversals:** Ledger entries are technically immutable, but there's no reversal workflow in the UI to correct posted entries (the standard accounting practice).

---

## 4. WHERE ALL THE DATA COMES FROM (Data Flow)

### Data Entry Points → Accounting Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA ORIGINS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  MANUAL (via Frontend/API)          AUTOMATIC (via Events)       │
│  ──────────────────────             ─────────────────────        │
│  Chart of Accounts (COA)            HR Salary Processed          │
│  Journal Entries                    → expense accrual journal    │
│  Expenses                           HR Salary Paid               │
│  Income                             → cash payment journal       │
│  Customers/Invoices                                              │
│  Vendors/Bills                                                    │
│  Budgets + Lines                                                  │
│  Customer/Vendor Payments                                         │
│                                                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
     ┌─────────────────────────────────────────────────┐
     │                ACCOUNTING ENGINE                   │
     │  (app/modules/accounts/)                           │
     │                                                    │
     │  Journal Entry (draft)                             │
     │  → Journal.submit()                                │
     │  → Journal.approve()                               │
     │  → Journal.post() → Ledger Entry (immutable)       │
     │                                                    │
     │  Event Bus publishes:                              │
     │  - journal.posted                                  │
     │  - expense.created                                 │
     │  - income.created                                  │
     │  - invoice.created / invoice.paid                  │
     │  - bill.created / bill.paid                        │
     │  - budget.created / budget.exceeded                │
     │  - salary.processed / salary.paid / salary.accrued │
     └─────────────────────┬─────────────────────────────┘
                          │
                          ▼
     ┌─────────────────────────────────────────────────┐
     │              GENERAL LEDGER                       │
     │  (ledger_entries — immutable, RESTRICT on delete) │
     │                                                    │
     │  Source of Truth for ALL financial data            │
     └─────────────────────┬─────────────────────────────┘
                          │
                          ▼
     ┌─────────────────────────────────────────────────┐
     │            FINANCIAL REPORTS                      │
     │                                                    │
     │  Trial Balance  →  SUM(debit), SUM(credit)        │
     │                      Verifies Debits = Credits     │
     │                                                    │
     │  Profit & Loss  →  Revenue - Expenses = Net Profit │
     │                                                    │
     │  Balance Sheet  →  Assets = Liabilities + Equity   │
     │                                                    │
     │  ⚠️ Cash Flow Statement → NOT IMPLEMENTED          │
     │                                                    │
     │  All reports generated LIVE from ledger each time  │
     └─────────────────────────────────────────────────┘
```

### Detailed Data Flow Per Feature

#### Expense Flow

```
User creates expense via UI/API
  → Expense record saved (status: "draft")
  → create_expense_journal() called
    → Journal created (Dr Expense Account, Cr Cash/Bank) — status: "draft"
    → expense.journal_id = journal.id
  → event_bus.publish("expense.created", { expense_id, amount, account_id, journal_id })
    → Recorded in event_store table
  → ⚠️ Journal stays in draft forever — never submitted/approved/posted
```

#### Income Flow

```
User creates income via UI/API
  → Income record saved (status: "draft")
  → create_income_journal() called
    → Journal created (Dr Cash/Bank, Cr Income Account) — status: "draft"
  → event_bus.publish("income.created", ...)
  → ⚠️ Same issue — journal stays in draft
```

#### Invoice (AR) Flow

```
User creates customer → saved to customers table

User creates invoice → Invoice saved (status: "draft")
  → create_invoice_journal() called
    → Journal: Dr Accounts Receivable (1200), Cr Revenue (4000) — status: "draft"
  → event_bus.publish("invoice.created", ...)

User records payment → CustomerPayment saved
  → create_payment_journal() called
    → Journal: Dr Cash (1000), Cr AR (1200) — status: "draft"
  → invoice.paid_amount += payment.amount
  → if paid_amount >= amount → invoice.status = "paid"
  → event_bus.publish("invoice.paid", ...)
```

#### Bill (AP) Flow

```
User creates vendor → saved to vendors table

User creates bill → Bill saved (status: "draft")
  → create_bill_journal() called
    → Journal: Dr Expense (5000), Cr AP (2000) — status: "draft"
  → event_bus.publish("bill.created", ...)

User records payment → VendorPayment saved
  → create_vendor_payment_journal() called
    → Journal: Dr AP (2000), Cr Cash (1000) — status: "draft"
  → bill.paid_amount += payment.amount
  → if paid_amount >= amount → bill.status = "paid"
  → event_bus.publish("bill.paid", ...)
```

#### Budget Consumption Flow

```
User creates budget → Budget saved → event "budget.created"

User adds budget line → BudgetLine saved
  → calculate_budget_consumption()
    → Queries ledger: SUM(debit) WHERE account_id = budget_line.account_id
    → Sets spent_amount and consumed_percentage
    → If > 100% → event_bus.publish("budget.exceeded", ...)
  → ⚠️ Only recalculates when line added — not on new ledger entries
```

#### Salary Integration Flow (cross-module)

```
HR module processes salary
  → event_bus.publish("salary.processed", { amount, reference, timestamp })

Accounts handler: handle_salary_processed()
  → Creates Journal: Dr Salary Expense (5000), Cr Salary Payable (2100)
  → Posts directly (skips draft → submit → approve — status set to "approved" then posted)
  → event_bus.publish("salary.accrued", ...)

HR module pays salary
  → event_bus.publish("salary.paid", { amount, reference, timestamp })

Accounts handler: handle_salary_paid()
  → Creates Journal: Dr Salary Payable (2100), Cr Cash (1000)
  → Posts directly
  → event_bus.publish("salary.paid", ...)
```

#### AI Vector Flow

```
Manual trigger: POST /api/accounts/ai/index-documents
  → Reads all accounts tables (COA, journals, invoices, bills, expenses, income, budgets, customers, vendors)
  → Constructs text content for each entity
  → Chunks via chunk_document() (max 700 tokens, 100 overlap)
  → Embeds via OpenAI text-embedding-3-small
  → Stores in search_documents table with pgvector HNSW index

Chat: POST /api/accounts/ai/chat
  → Embeds user question
  → Vector search: 1 - (embedding <=> query) in search_documents
  → Retrieve top 8 similar chunks
  → Build context string
  → Call GPT-4o-mini with system prompt + context + question
  → Return answer
```

### Database Tables

#### Core Accounting Tables

| Table | Schema File | Key Columns | Purpose |
|-------|------------|-------------|---------|
| `chart_of_accounts` | `models.py` | `id, account_code, account_name, account_type, parent_account_id, is_active` | Account definitions (Asset, Liability, Equity, Revenue, Expense) |
| `journal_entries` | `models.py` | `id, reference, description, status, date, submitted_at, approved_at, posted_at` | Journal header with lifecycle status |
| `journal_lines` | `models.py` | `id, journal_id, account_id, memo, debit, credit` | Individual debit/credit lines |
| `ledger_entries` | `models.py` | `id, journal_id, account_id, debit, credit, posting_date` | Immutable posted entries |

#### Transaction Tables

| Table | Schema File | Key Columns | Purpose |
|-------|------------|-------------|---------|
| `expenses` | `transaction_models.py` | `id, description, amount, expense_date, account_id, journal_id, status` | Expense records |
| `income` | `transaction_models.py` | `id, description, amount, income_date, account_id, journal_id, status` | Income records |

#### AR/AP Tables

| Table | Schema File | Key Columns | Purpose |
|-------|------------|-------------|---------|
| `customers` | `ar_models.py` | `id, name, email, phone, address, is_active` | Customer records |
| `invoices` | `ar_models.py` | `id, customer_id, invoice_number, amount, paid_amount, status, journal_id` | Customer invoices with payment tracking |
| `customer_payments` | `ar_models.py` | `id, invoice_id, amount, reference, journal_id` | Customer payments |
| `vendors` | `ap_models.py` | `id, name, email, phone, address, is_active` | Vendor records |
| `bills` | `ap_models.py` | `id, vendor_id, bill_number, amount, paid_amount, status, journal_id` | Vendor bills with payment tracking |
| `vendor_payments` | `ap_models.py` | `id, bill_id, amount, reference, journal_id` | Vendor payments |

#### Budget Tables

| Table | Schema File | Key Columns | Purpose |
|-------|------------|-------------|---------|
| `budgets` | `budget_models.py` | `id, name, fiscal_year, total_amount, status, start_date, end_date` | Budget headers |
| `budget_lines` | `budget_models.py` | `id, budget_id, account_id, allocated_amount, spent_amount, consumed_percentage` | Per-account budget allocations |

#### Audit & Vector Tables

| Table | Schema File | Key Columns | Purpose |
|-------|------------|-------------|---------|
| `event_store` | `event_store.py` | `id, event_type, payload (JSON), processed, created_at` | Complete audit trail of all financial events |
| `search_documents` | Created in `main.py` | `id (UUID), organization_id, entity_type, content, embedding (vector(1536)), metadata (JSONB)` | Vector store for RAG chatbot |

### Default Chart of Accounts (Seeded at Startup)

| Code | Name | Type |
|------|------|------|
| 1000 | Cash | Asset |
| 1100 | Bank | Asset |
| 1200 | Accounts Receivable | Asset |
| 2000 | Accounts Payable | Liability |
| 2100 | Salary Payable | Liability |
| 3000 | Capital | Equity |
| 4000 | Revenue | Revenue |
| 5000 | Expenses | Expense |

---

## 5. HOW AN ACCOUNTS MODULE **SHOULD** WORK (ERP Standards)

### A. Complete Journal Lifecycle Management

- **Draft → Submit → Approve → Post** workflow with proper role separation (maker-checker)
- Creator submits, Supervisor approves, Accountant posts — no single person does all steps
- Auto-generated journals (from expenses, invoices, etc.) should still go through approval unless configured for auto-posting
- ✅ Your journal engine does this correctly. ❌ Auto-generated journals bypass it (stuck in draft)

### B. Full Financial Statement Suite

| Statement | Status | Notes |
|-----------|--------|-------|
| **Trial Balance** | ✅ Done | Verifies Debits = Credits |
| **Profit & Loss** | ✅ Done | Revenue - Expenses = Net Profit |
| **Balance Sheet** | ✅ Done | Assets = Liabilities + Equity |
| **Cash Flow Statement** | ❌ Missing | Operating, Investing, Financing activities |
| **Aged Receivables** | ❌ Missing | 0-30, 31-60, 61-90, 90+ days buckets |
| **Aged Payables** | ❌ Missing | Same aging buckets |
| **GL Detail** | ✅ Done | Ledger explorer with filters |

### C. Real-Time Budget Monitoring

- ✅ Budget creation and line allocation works
- ⚠️ Consumption should update on **every transaction**, not just when lines are added
- ❌ No threshold notifications (75%, 90% consumed) in the UI
- ❌ No Budget vs Actual variance report

### D. AR/AP Complete Lifecycle

- ✅ Customer/vendor management
- ✅ Invoice/bill creation with payment tracking
- ❌ Overdue invoice/bill reporting
- ❌ Dunning/collections workflow
- ❌ Automated reminders
- ❌ Credit limit enforcement

### E. Month-End Closing Process

- ❌ No period locking (prevent entries after close)
- ❌ No adjustment journal workflow
- ❌ No closing checklist
- ❌ No retained earnings calculation at year-end

### F. Audit Trail & Compliance

- ✅ Event store records all financial actions
- ✅ Ledger entries are immutable (can't edit/delete posted entries)
- ❌ No reversal entry workflow in UI (the standard way to correct mistakes)
- ❌ No period locks to prevent back-dated entries

### G. Bank Reconciliation

- ❌ Not implemented at all
- Standard: Import bank statement → auto-match → review exceptions → reconcile

### H. Tax Management

- ❌ Not implemented
- Standard: GST/VAT per transaction → tax payable accounts → quarterly filing reports

---

## 6. GAPS SUMMARY (Priority Order)

```
Priority 1 (Fundamental Accounting)
────────────────────────────────────
  ❌ Cash Flow Statement
  ❌ Aged AR/AP reports
  ❌ Auto-journals not posted (stuck in draft)

Priority 2 (Workflow Completeness)
────────────────────────────────────
  ❌ Budget consumption auto-refresh on transaction
  ❌ Reversal entry workflow
  ❌ Overdue invoice/bill alerts

Priority 3 (Month-End & Compliance)
────────────────────────────────────
  ❌ Period locks / fiscal year management
  ❌ Month-end closing process
  ❌ Retained earnings calculation

Priority 4 (Advanced)
────────────────────────────────────
  ❌ Bank reconciliation
  ❌ Tax management (GST/VAT)
  ❌ Dunning/collections
  ❌ Automatic AI vector sync on events
```

---

## 7. WHAT'S GOOD (Strengths to Keep)

- **Solid double-entry engine** — journal lifecycle, debit=credit validation, ledger immutability all correct
- **Event-driven architecture** — all actions publish events, recorded for audit
- **Cross-module integration** — salary events from HR flow into accounting auto-magically
- **AI features** — RAG chatbot + AI insights are ahead of typical accounting modules
- **Department permissions** — granular page and action controls per role
- **Auto-journal generation** — expenses, income, AR, AP all correctly generate double-entry pairs
- **Real-time reports** — never cached, always from current ledger
- **Frontend** — all 10 pages working with permission guards

---

## 8. API ENDPOINT REFERENCE

### Core Accounting

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/accounts/` | Module health + counts |
| POST | `/api/accounts/coa` | Create chart of account |
| GET | `/api/accounts/coa` | List chart of accounts |
| POST | `/api/accounts/journals` | Create journal entry (draft) |
| GET | `/api/accounts/journals` | List journal entries |
| GET | `/api/accounts/journals/{id}` | Get journal with lines |
| POST | `/api/accounts/journals/{id}/submit` | Submit for approval |
| POST | `/api/accounts/journals/{id}/approve` | Approve journal |
| POST | `/api/accounts/journals/{id}/post` | Post to ledger |
| GET | `/api/accounts/ledger` | List ledger entries |

### Transactions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/accounts/expenses` | Create expense + auto-journal |
| GET | `/api/accounts/expenses` | List expenses |
| POST | `/api/accounts/income` | Create income + auto-journal |
| GET | `/api/accounts/income` | List income |

### Accounts Receivable

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/accounts/customers` | Create customer |
| GET | `/api/accounts/customers` | List customers |
| POST | `/api/accounts/invoices` | Create invoice + auto-journal |
| GET | `/api/accounts/invoices` | List invoices |
| POST | `/api/accounts/invoices/{id}/payments` | Record payment + auto-journal |

### Accounts Payable

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/accounts/vendors` | Create vendor |
| GET | `/api/accounts/vendors` | List vendors |
| POST | `/api/accounts/bills` | Create bill + auto-journal |
| GET | `/api/accounts/bills` | List bills |
| POST | `/api/accounts/bills/{id}/payments` | Record payment + auto-journal |

### Budgets

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/accounts/budgets` | Create budget |
| GET | `/api/accounts/budgets` | List budgets |
| POST | `/api/accounts/budgets/{id}/lines` | Add budget line |
| GET | `/api/accounts/budgets/{id}/lines` | List budget lines |

### Reports

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/accounts/reports/trial-balance` | Trial balance |
| GET | `/api/accounts/reports/profit-loss` | Profit & Loss |
| GET | `/api/accounts/reports/balance-sheet` | Balance Sheet |

### AI & Chat

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/accounts/ai/insights` | AI financial analysis |
| POST | `/api/accounts/ai/chat` | RAG chatbot query |
| POST | `/api/accounts/ai/index-documents` | Rebuild vector index |

---

## 9. FRONTEND PAGES REFERENCE

| Page | Route Tab | Permission Required | Purpose |
|------|-----------|-------------------|---------|
| **Overview** | `overview` | All departments | Module status + department-specific summary |
| **Chart of Accounts** | `coa` | Admin, Finance | Create/list account codes |
| **Journals** | `journals` | Admin, Finance | Create/submit/approve/post journal entries |
| **Ledger** | `ledger` | Admin, Finance | View immutable ledger with account type filter |
| **Transactions** | `transactions` | Admin, Finance, Marketing, Operations, IT | Create expenses and income |
| **Accounts Receivable** | `ar` | Admin, Finance, Sales | Customers, invoices, payments |
| **Accounts Payable** | `ap` | Admin, Finance | Vendors, bills, payments |
| **Budgets** | `budgets` | Admin, Finance, HR, Marketing, Operations, IT | Create budgets + allocate lines + track consumption |
| **Reports** | `reports` | Admin, Finance | Trial Balance, P&L, Balance Sheet with detail views |
| **AI Insights** | `ai-insights` | Admin, Finance | Generate AI-powered financial analysis |

---

## 10. KEY CODE FILE LOCATIONS

### Backend (Accounts Module)

```
backend/app/modules/accounts/
├── __init__.py                    # Module init
├── routers.py                     # All API endpoints (30+)
├── services.py                    # Journal posting, COA seeding, validation
├── schemas.py                     # Pydantic schemas for core models
├── models.py                      # SQLAlchemy models: COA, JournalEntry, JournalLine, LedgerEntry
├── transaction_models.py          # Expense, Income models
├── transaction_schemas.py         # Expense/Income Pydantic schemas
├── transaction_services.py        # Auto-journal generation for expenses/income
├── ar_models.py                   # Customer, Invoice, CustomerPayment models
├── ar_services.py                 # Invoice/payment journal generation
├── ap_models.py                   # Vendor, Bill, VendorPayment models
├── ap_services.py                 # Bill/payment journal generation
├── budget_models.py               # Budget, BudgetLine models
├── budget_services.py             # Budget consumption calculation
├── reports_schemas.py             # Report response schemas
├── reports_services.py            # TrialBalance, ProfitLoss, BalanceSheet classes
├── account_lookups.py             # get_account_id_by_code(), get_cash_account_id()
├── ai_service.py                  # AI insights generation via LLM
├── ai_schemas.py                  # Insight schemas
├── chat_service.py                # RAG chatbot with vector search
├── chat_schemas.py                # Chat request/response schemas
├── salary_event_handlers.py       # HR salary event → accounting journals
├── vector_indexer.py              # Document → chunk → embed → store pipeline
```

### Core Infrastructure

```
backend/app/core/
├── config.py                      # Settings: DB URLs, API keys
├── database.py                    # Engine, SessionLocal, get_db()
├── base.py                        # SQLAlchemy Base + BaseModel (created_at, updated_at)
├── event_bus.py                   # In-memory publish/subscribe
├── event_handlers.py              # Event recorder registration
├── event_store.py                 # EventStore model for audit trail
```

### Frontend (Accounts Module)

```
frontend/src/modules/accounts/
├── AccountsModule.jsx             # Main module with navigation + permission wrapper
├── accountsPermissions.jsx        # Department-based permission logic + provider
├── components/
│   ├── AccountsChatBot.jsx        # RAG chatbot UI component
│   └── FinanceSummary.jsx         # Financial summary cards (revenue, expenses, profit)
└── pages/
    ├── AccountsPage.jsx           # Overview / dashboard
    ├── COAPage.jsx                # Chart of Accounts management
    ├── JournalsPage.jsx           # Journal creation + lifecycle + history
    ├── LedgerPage.jsx             # Immutable ledger view with filters
    ├── TransactionsPage.jsx       # Expense/Income recording
    ├── ARPage.jsx                 # Customers, invoices, payments
    ├── APPage.jsx                 # Vendors, bills, payments
    ├── BudgetsPage.jsx            # Budget creation + lines + consumption
    ├── ReportsPage.jsx            # Trial Balance, P&L, Balance Sheet
    └── AIInsightsPage.jsx         # AI financial insights
```

---

*Analysis generated from comprehensive codebase review of backend, frontend, and documentation files.*
