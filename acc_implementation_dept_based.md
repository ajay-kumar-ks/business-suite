Accounts Module Final Audit + Permission Migration

Current State:

* Accounting backend is complete.
* COA, Journals, Ledger, AR, AP, Budgets, Reports are implemented.
* Event bus is implemented.
* Role-based permissions are implemented.
* JSX issues are fixed.
* Do not modify any module outside Accounts.

Requirement Change:

Replace role-based Accounts permissions with department-based permissions.

Departments:

* Admin
* Finance
* HR
* Marketing
* Operations
* Sales
* IT

Keep all accounting APIs, workflows, database models, event bus logic, journals, ledger, AR/AP, budgets and reports unchanged.

Tasks:

1. Migrate Accounts permissions from role-based to department-based.

2. Create a centralized Accounts permission map instead of scattered checks.

3. Update Accounts navigation visibility.

4. Update Accounts dashboard visibility.

Department Access:

Admin:

* Full access to all Accounts features.

Finance:

* Full accounting operations.
* Transactions
* Journals
* Ledger
* AR
* AP
* Budgets
* Reports

HR:

* Payroll/Budget visibility only.
* No Ledger/Journals/Financial Statements.

Marketing:

* Marketing budget and expenses only.

Operations:

* Operations budget and expenses only.

Sales:

* Customer invoices and payment status only.

IT:

* IT budget and IT expenses only.

5. Audit all Accounts pages:

* Dashboard
* Transactions
* AR
* AP
* COA
* Journals
* Ledger
* Budgets
* Reports

Verify:

* Page loads successfully.
* Permissions are respected.
* No broken JSX.
* No runtime errors.

6. Audit all API integrations.

Verify:

* Endpoint URLs
* Request payloads
* Response handling
* Loading states
* Error states

7. Verify accounting workflows remain functional.

Expense → Journal → Ledger

Income → Journal → Ledger

Invoice → AR → Journal → Ledger

Invoice Payment → Journal → Ledger

Bill → AP → Journal → Ledger

Bill Payment → Journal → Ledger

Budget → Consumption Tracking

8. Verify Reports.

* Trial Balance
* Profit & Loss
* Balance Sheet

Ensure data comes from existing report APIs.

9. Dashboard Completion

Admin:

* Revenue
* Expenses
* Profit
* Receivables
* Payables

Finance:

* Pending Invoices
* Pending Bills
* Budget Utilization

HR:

* Payroll Expense
* Department Budget

Marketing:

* Budget Usage
* Marketing Spend

Operations:

* Budget Usage
* Operations Spend

Sales:

* Outstanding Invoices
* Collections

IT:

* IT Budget
* IT Expenses

10. Produce final report.

Return:

* Missing features
* Broken integrations
* Permission issues
* Dashboard gaps
* Recommended fixes

Constraints:

* Modify ONLY Accounts module.
* Reuse existing APIs.
* Do not refactor backend accounting logic.
* Do not redesign architecture.
* Prefer fixing and completing existing implementation over creating new systems.
