from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    print('Triggers:')
    tr = conn.execute(sa.text("SELECT tgname FROM pg_trigger WHERE tgrelid = 'chart_of_accounts'::regclass AND NOT tgisinternal"))
    print(tr.fetchall())
    print('Policies:')
    pol = conn.execute(sa.text("SELECT polname FROM pg_policy WHERE polrelid = 'chart_of_accounts'::regclass"))
    print(pol.fetchall())
    print('Constraints:')
    cons = conn.execute(sa.text("SELECT conname, contype FROM pg_constraint WHERE conrelid = 'chart_of_accounts'::regclass"))
    print(cons.fetchall())
    print('FKs:')
    fks = conn.execute(sa.text("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE contype='f' AND conrelid = 'chart_of_accounts'::regclass"))
    print(fks.fetchall())
