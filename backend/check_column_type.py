from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT column_name, data_type, udt_name, character_maximum_length FROM information_schema.columns WHERE table_name='chart_of_accounts' and column_name='tenant_id'"))
    rows = res.fetchall()
    for r in rows:
        print(r)
    if not rows:
        print('no column info')
