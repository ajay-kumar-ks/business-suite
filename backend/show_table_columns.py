from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT column_name, data_type, udt_name, column_default, is_nullable FROM information_schema.columns WHERE table_name='chart_of_accounts'"))
    for r in res.fetchall():
        print(r)
