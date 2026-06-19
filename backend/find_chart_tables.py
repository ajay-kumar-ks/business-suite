from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT nspname, relname FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE relname='chart_of_accounts'"))
    for r in res.fetchall():
        print(r)
