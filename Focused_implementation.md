You are implementing ONLY the Accounts Module of an existing ERP system.

IMPORTANT CONSTRAINTS:

* DO NOT modify any module outside Accounts.
* DO NOT modify Auth, HR, CRM, Sales, Employee, Dashboard, or shared application logic.
* DO NOT refactor existing architecture.
* USE existing role/user information already available in the system.
* BUILD ONLY Accounts frontend pages, role-based views, and permissions.
* Existing accounting backend APIs are already implemented.
* Existing accounting engine, journals, ledger, AR/AP, budgets, reports, event bus, and posting logic already exist.
* Consume existing APIs instead of creating duplicate business logic.

SYSTEM CONTEXT:

The company is a SINGLE COMPANY ERP (not SaaS).

Users include:

* Admin
* HR
* Accountant
* Sales Employee
* Software Developer
* Tester
* Department Managers
* General Employees

Different users must see different Accounts information.

====================================================
ROLE BASED ACCOUNTS ACCESS
==========================

ADMIN

Purpose:
Full financial visibility.

Can View:

* Dashboard
* Revenue
* Expenses
* Profit
* Budgets
* Trial Balance
* Balance Sheet
* Profit & Loss
* Ledger
* Journals
* Customers
* Vendors
* Invoices
* Bills

Can Perform:

* Everything inside Accounts

---

ACCOUNTANT

Purpose:
Daily accounting operations.

Can View:

* Dashboard
* Journal Entries
* Ledger
* Customers
* Vendors
* Invoices
* Bills
* Budgets
* Trial Balance
* Profit & Loss
* Balance Sheet

Can Perform:

* Create Expense
* Create Income
* Create Journal
* Submit Journal
* Create Invoice
* Record Customer Payment
* Create Bill
* Record Vendor Payment
* Manage Budgets

Primary User of Accounts Module.

---

HR

Purpose:
Payroll and budget awareness.

Can View:

* Department Budget
* Payroll Expenses
* Expense Summary

Cannot View:

* Ledger
* Journals
* Balance Sheet
* Trial Balance

No accounting posting access.

---

SALES EMPLOYEE

Purpose:
Customer invoice tracking.

Can View:

* Own Customer Invoices
* Payment Status
* Outstanding Receivables

Can Perform:

* Create Invoice Request (if supported)

Cannot View:

* Ledger
* Journals
* Budgets
* Financial Reports

---

DEPARTMENT MANAGER

Purpose:
Budget monitoring.

Can View:

* Department Budget
* Budget Consumption
* Remaining Budget
* Department Expenses

Can Perform:

* Submit Expense Requests

Cannot View:

* Company Ledger
* Trial Balance
* Balance Sheet

---

SOFTWARE DEVELOPER / TESTER / GENERAL EMPLOYEE

Purpose:
Minimal access.

Can View:

* Reimbursement Requests
* Expense Claims Submitted By Self

Can Perform:

* Create Expense Reimbursement Request

Cannot View:

* Revenue
* Profit
* Ledger
* Financial Reports
* Company Financial Data

====================================================
FRONTEND IMPLEMENTATION
=======================

Build Accounts pages using existing APIs:

1. Accounts Dashboard
2. Transactions
3. Invoices
4. Bills
5. Customers
6. Vendors
7. Budgets
8. Reports
9. Journal Entries
10. Ledger

====================================================
DASHBOARD BEHAVIOR
==================

Admin Dashboard:

Cards:

* Revenue
* Expenses
* Profit
* Cash Position
* Outstanding Receivables
* Outstanding Payables

Charts:

* Revenue Trend
* Expense Trend
* Budget Usage

---

Accountant Dashboard:

Cards:

* Revenue
* Expenses
* Pending Invoices
* Pending Bills
* Budget Utilization

Tables:

* Recent Journals
* Recent Transactions

---

HR Dashboard:

Cards:

* Payroll Expenses
* Department Budget

---

Manager Dashboard:

Cards:

* Budget Allocated
* Budget Used
* Budget Remaining

---

Employee Dashboard:

Cards:

* My Claims
* Pending Claims

====================================================
PERMISSION IMPLEMENTATION
=========================

Implement frontend route protection.

Hide pages user cannot access.

Hide menu items user cannot access.

Disable actions user cannot perform.

Never rely only on frontend checks.

Respect backend permissions when available.

====================================================
DELIVERABLES
============

1. Role-based Accounts sidebar.
2. Role-based Accounts dashboard.
3. Role-based page visibility.
4. Role-based action visibility.
5. Reuse existing Accounts APIs.
6. No backend accounting logic changes unless absolutely required.
7. No modifications outside Accounts module.

Start by analyzing existing project structure and role implementation, then implement Accounts role-based UI incrementally.
