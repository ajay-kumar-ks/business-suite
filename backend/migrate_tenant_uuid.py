from app.core.database import engine
from sqlalchemy import text
tables = [
    'chart_of_accounts', 'journal_entries', 'journal_lines', 'ledger_entries',
    'vendors', 'bills', 'vendor_payments', 'customers', 'invoices', 'customer_payments',
    'budgets', 'budget_lines'
]
with engine.connect() as conn:
    for t in tables:
        try:
            print('Altering', t)
            conn.execute(text(f"ALTER TABLE {t} ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid"))
            print('OK', t)
        except Exception as e:
            print('ERR', t, str(e))
