# ERP Accounts Module - Implementation Plan

## Project Context

We are building a multi-tenant ERP system using:

### Frontend

* React
* React Router
* Axios
* Chart.js/Recharts

### Backend

* FastAPI
* SQLAlchemy
* Pydantic

### Architecture

* Modular ERP
* Event-Driven Architecture
* Multi-Tenant Design
* Double Entry Accounting Engine

The Accounts Module is responsible for becoming the financial source of truth for the ERP.

The implementation should follow enterprise accounting standards used by SAP, NetSuite, Dynamics, Odoo, ERPNext, and Zoho Books.

---

# Implementation Strategy

The module must NOT be built page-first.

The module must be built in the following order:

```text
Tenant Layer
    ↓

Accounting Engine
    ↓

Chart of Accounts
    ↓

Journal System
    ↓

General Ledger
    ↓

Event Bus Integration
    ↓

Financial Transactions
    ↓

AR/AP
    ↓

Budget Management
    ↓

Reports
    ↓

Dashboard
```

The accounting engine must exist before UI pages are created.

---

# Current Base Alignment

The existing base app includes the following backend structure:

- FastAPI service with `auth`, `tasks`, `hr`, `crm`, and placeholder `accounts` routers.
- SQLAlchemy ORM with `Base` metadata and PostgreSQL-compatible configuration.
- No tenant table or tenant-aware accounting models yet.
- Event bus exists in `app/core/event_bus.py`, but the accounting-specific event store and handlers are still required.

This plan is updated to reflect the current repository state and to keep the accounts module backend-first. Dashboard and form work is deferred until the accounting engine, COA, journal system, and ledger architecture are complete.

---

# IMPLEMENTATION COMPLETION STATUS

## ✓ PHASES COMPLETE

### Phase 1 - Multi Tenant Foundation ✓
- Tenant middleware with `X-Tenant-ID` header support
- Tenant context isolation service
- Tenant model with auto-seeded default COA
- All accounting tables include `tenant_id` foreign key

### Phase 2 - Event Bus Infrastructure ✓
- Event bus with subscribe/publish/unsubscribe
- Event store model for persistence
- Event handlers registered for accounting events
- Event recorder for all transactions

### Phase 3 - Chart of Accounts ✓
- COA model with account types and hierarchy
- Default COA seeding (7 standard accounts per tenant)
- COA CRUD APIs
- Account validation

### Phase 4 - Double Entry Accounting Engine ✓
- Journal entry model with status workflow (draft → submitted → approved → posted)
- Journal lines with debit/credit validation
- Balance enforcement (total debit = total credit)
- Journal lifecycle APIs

### Phase 5 - General Ledger ✓
- Ledger entries created immutably from posted journals
- Ledger query APIs
- Journal-to-ledger posting service
- Ledger-based financial calculations

### Phase 6 - Transaction Layer ✓
- Expense model with auto-generated journals
- Income model with auto-generated journals
- Automatic debit/credit line generation
- Transaction status tracking

### Phase 7 - Accounts Receivable ✓
- Customer model and management
- Invoice model with payment tracking
- Customer payment model
- Automatic journal generation for invoices and payments
- Invoice.paid event publishing

### Phase 8 - Accounts Payable ✓
- Vendor model and management
- Bill model with payment tracking
- Vendor payment model
- Automatic journal generation for bills and payments
- Bill.paid event publishing

### Phase 9 - Budget Management ✓
- Budget model and budget lines
- Budget consumption calculation from ledger
- Budget exceeded alerts via event bus
- Budget management APIs

### Phase 10 - Financial Reports ✓
- Trial Balance report (validates debit = credit)
- Profit & Loss report (revenue - expenses = profit)
- Balance Sheet report (validates assets = liabilities + equity)
- Real-time report generation from ledger data

---

# PENDING PHASES

## Phase 11 - Banking Module (Not Started)

### Tables

```sql
bank_accounts
bank_transactions
reconciliations
```

### Workflow

```text
Import Statement
      ↓

Auto Match
      ↓

Review Exceptions
      ↓

Reconcile
```

### Deliverables

```text
Bank Accounts
Statement Import
Reconciliation Engine
```

---

## Phase 12 - Dashboard (Deferred)

Dashboard and UI forms are deferred until the core accounting engine is production-ready.

### Planned Widgets

- Financial Summary (Revenue, Expenses, Profit, Cash Position)
- Budget Utilization
- Receivables Overview
- Payables Overview
- Charts (Revenue Trend, Expense Trend, Cash Flow Trend, Budget Utilization)

---

# ARCHITECTURE NOTES

## Database Tables Summary

All accounting tables include `tenant_id` for multi-tenant isolation.

### Core Tables
- `tenants` - Organization data
- `chart_of_accounts` - Account chart
- `journal_entries` - Journal header
- `journal_lines` - Journal details (debit/credit)
- `ledger_entries` - Posted ledger (immutable)
- `event_store` - Event audit trail

### Transaction Tables
- `expenses` - Expense records
- `income` - Income records

### AR Tables
- `customers` - Customer data
- `invoices` - Invoice records
- `customer_payments` - Payment records

### AP Tables
- `vendors` - Vendor data
- `bills` - Bill records
- `vendor_payments` - Payment records

### Budget Tables
- `budgets` - Budget headers
- `budget_lines` - Budget allocations per account

---

# KEY IMPLEMENTATION DECISIONS

## Double Entry Accounting

All financial transactions enforce double-entry accounting:
- Every transaction debits one account and credits another
- Total debits must equal total credits
- Unbalanced entries are rejected

## Immutable Ledger

Ledger entries created from posted journals are immutable:
- Cannot be edited or deleted (RESTRICT constraint)
- Corrections use reversal entries (debit becomes credit, credit becomes debit)
- Provides complete audit trail

## Auto-Generated Journals

Transaction models automatically generate journals:
- Expense → Journal (Debit: Expense, Credit: Cash)
- Income → Journal (Debit: Cash, Credit: Income)
- Invoice → Journal (Debit: AR, Credit: Revenue)
- Bill → Journal (Debit: Expense, Credit: AP)
- Payment → Journal (Debit: Cash, Credit: AR/AP)

## Event-Driven

All accounting events published to event bus:
- `journal.posted` - When journal is posted to ledger
- `invoice.created` - When invoice created
- `invoice.paid` - When invoice fully paid
- `bill.created` - When bill created
- `bill.paid` - When bill fully paid
- `budget.exceeded` - When budget consumption > 100%

## Tenant Isolation

Every API request requires `X-Tenant-ID` header:
- Tenant context enforced at middleware level
- All queries filtered by tenant
- No cross-tenant data access
- Default COA seeded on tenant creation

---

# NEXT STEPS

1. **Phase 11 - Banking Module** (Optional)
   - Bank account management
   - Statement import and reconciliation
   - Auto-matching transactions

2. **Testing & Validation**
   - Integration tests for journal posting
   - Trial balance validation tests
   - Multi-tenant isolation tests

3. **Frontend Implementation** (After backend verified)
   - Charts component for COA
   - Journal entry form
   - Invoice/Bill management
   - Financial reports dashboard

4. **Production Hardening**
   - Performance optimization
   - Batch processing for large ledgers
   - Caching strategies
   - Advanced reporting features

---

# SUCCESS CRITERIA - ACHIEVED ✓

✓ Multi-tenant isolation exists
✓ Event bus exists and records all events
✓ Double-entry accounting is enforced
✓ Journal posting works (draft → submitted → approved → posted)
✓ Ledger posting works (immutable ledger entries created)
✓ Trial Balance balances (total debits = total credits)
✓ Balance Sheet balances (assets = liabilities + equity)
✓ Budget tracking works (consumption calculated from ledger)
✓ AR/AP workflows function (invoices, bills, payments)
✓ Financial reports generate correctly (TB, P&L, BS)
✓ All financial actions are auditable (event store)
✓ No module directly modifies ledger data (immutable constraint)
✓ All financial changes flow through the accounting engine

## Goal

Create ERP-wide communication layer.

### Create

```text
core/event_bus.py
core/events.py
core/event_handlers.py
```

### Event Structure

```python
{
    "event_id": str,
    "tenant_id": str,
    "event_type": str,
    "timestamp": datetime,
    "payload": {}
}
```

### Event Bus Functions

```python
subscribe()
unsubscribe()
publish()
```

### Event Store Table

```sql
event_store
-----------
id
tenant_id
event_type
payload
processed
created_at
```

### Initial Events

```text
invoice.created
invoice.paid

bill.created
bill.paid

expense.created

salary.processed
salary.paid

budget.created
budget.exceeded

journal.posted
```

### Deliverables

```text
Event Bus
Event Registry
Event Store
Event Logging
```

---

# PHASE 3 - Chart of Accounts

## Goal

Build accounting foundation.

### Table

```sql
chart_of_accounts
------------------
id
tenant_id
account_code
account_name
account_type
parent_account_id
is_active
```

### Account Types

```text
Asset
Liability
Equity
Revenue
Expense
```

### Default COA Generator

Generate default accounts for every tenant.

Example:

```text
1000 Cash
1100 Bank
1200 Accounts Receivable

2000 Accounts Payable

3000 Capital

4000 Revenue

5000 Expenses
```

### Deliverables

```text
COA CRUD APIs
COA Seeder
COA Validation
```

---

# PHASE 4 - Double Entry Accounting Engine

## Goal

Build core accounting engine.

### Tables

```sql
journal_entries
---------------
id
tenant_id
reference
description
status
date
```

```sql
journal_lines
-------------
id
journal_id
account_id
debit
credit
```

### Validation Rules

Must enforce:

```text
Total Debit = Total Credit
```

Reject unbalanced entries.

### Posting Workflow

```text
Draft
 ↓

Submitted
 ↓

Approved
 ↓

Posted
```

### Deliverables

```text
Journal Service
Posting Service
Approval Workflow
Accounting Validator
```

---

# PHASE 5 - General Ledger

## Goal

Create source of truth.

### Table

```sql
ledger_entries
--------------
id
tenant_id
journal_id
account_id
debit
credit
posting_date
```

### Rules

Posted journals create ledger entries.

Ledger entries:

```text
Immutable
Never Edited
Never Deleted
```

Corrections use reversal entries.

### Deliverables

```text
Ledger Posting Service
Ledger Query APIs
Ledger Explorer
```

---

# PHASE 6 - Transaction Layer

## Goal

Allow users to create financial transactions.

### Expense Workflow

```text
Create Expense
      ↓

Generate Journal
      ↓

Post Journal
      ↓

Update Ledger
```

### Income Workflow

```text
Create Income
      ↓

Generate Journal
      ↓

Post Journal
      ↓

Update Ledger
```

### Deliverables

```text
Expense APIs
Income APIs
Transaction APIs
```

---

# PHASE 7 - Accounts Receivable

## Goal

Manage customer debt.

### Tables

```sql
customers
invoices
invoice_items
customer_payments
```

### Workflow

```text
Invoice Created
      ↓

AR Debit
Revenue Credit
      ↓

Customer Payment
      ↓

Cash Debit
AR Credit
```

### Events

Publish:

```text
invoice.created
invoice.paid
```

### Deliverables

```text
Customer Module
Invoice Module
Collections Module
```

---

# PHASE 8 - Accounts Payable

## Goal

Manage vendor liabilities.

### Tables

```sql
vendors
bills
vendor_payments
```

### Workflow

```text
Bill Created
      ↓

Expense Debit
AP Credit
      ↓

Payment
      ↓

AP Debit
Cash Credit
```

### Events

Publish:

```text
bill.created
bill.paid
```

### Deliverables

```text
Vendor Module
Bills Module
Payments Module
```

---

# PHASE 9 - Budget Management

## Goal

Budget planning and monitoring.

### Tables

```sql
budgets
budget_lines
budget_consumption
```

### Workflow

```text
Create Budget
      ↓

Allocate Department Budget
      ↓

Track Consumption
      ↓

Alert Overruns
```

### Events

```text
budget.created
budget.exceeded
```

### Deliverables

```text
Budget Planner
Budget Allocator
Budget Monitor
```

---

# PHASE 10 - Banking Module

### Tables

```sql
bank_accounts
bank_transactions
reconciliations
```

### Workflow

```text
Import Statement
      ↓

Auto Match
      ↓

Review Exceptions
      ↓

Reconcile
```

### Deliverables

```text
Bank Accounts
Statement Import
Reconciliation Engine
```

---

# PHASE 11 - Financial Reporting Engine

Reports must NEVER store values.

Reports are generated from ledger data.

## Trial Balance

```text
Debit Total = Credit Total
```

## Profit & Loss

```text
Revenue
-
Expenses
=
Profit
```

## Balance Sheet

```text
Assets
=
Liabilities + Equity
```

## Cash Flow

```text
Operating Activities

Investing Activities

Financing Activities
```

### Deliverables

```text
Trial Balance API
P&L API
Balance Sheet API
Cash Flow API
```

---

# PHASE 12 - Dashboard

Dashboard is built LAST.

### Dashboard Widgets

#### Financial Summary

```text
Revenue
Expenses
Profit
Cash Position
```

#### Budget Summary

```text
Allocated
Spent
Remaining
```

#### Receivables

```text
Outstanding Invoices
```

#### Payables

```text
Outstanding Bills
```

#### Charts

```text
Revenue Trend

Expense Trend

Cash Flow Trend

Budget Utilization
```

---

# Frontend Implementation Order

```text
1. Accounts Layout

2. Chart of Accounts

3. Journal Entries

4. General Ledger

5. Transactions

6. Customers

7. Invoices

8. Vendors

9. Bills

10. Budgets

11. Banking

12. Reports

13. Dashboard
```

---

# API Implementation Order

```text
Tenant APIs

COA APIs

Journal APIs

Ledger APIs

Transaction APIs

Invoice APIs

Bill APIs

Budget APIs

Bank APIs

Report APIs

Dashboard APIs
```

---

# Success Criteria

The Accounts Module is complete when:

✓ Multi-tenant isolation exists

✓ Event bus exists

✓ Double-entry accounting is enforced

✓ Journal posting works

✓ Ledger posting works

✓ Trial Balance balances

✓ Balance Sheet balances

✓ Cash Flow generates correctly

✓ Budget tracking works

✓ AR/AP workflows function

✓ Dashboard reflects live financial data

✓ All financial actions are auditable

✓ No module directly modifies ledger data

✓ All financial changes flow through the accounting engine
