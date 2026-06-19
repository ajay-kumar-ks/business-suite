from app.core.database import engine
import sqlalchemy as sa
import uuid
tenant = uuid.UUID('04e5e982-08f3-4c53-986e-f177430b0678')
tables = ['chart_of_accounts','journal_entries','journal_lines','ledger_entries','vendors','invoices']
with engine.connect() as conn:
    for t in tables:
        try:
            q = sa.text(f"SELECT count(*) FROM {t} WHERE tenant_id = :id")
            res = conn.execute(q, {'id': tenant})
            print(t, res.fetchone()[0])
        except Exception as e:
            print('ERR', t, type(e), e)
