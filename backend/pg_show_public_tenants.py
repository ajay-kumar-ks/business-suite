import sqlalchemy as sa
from app.core.database import engine

with engine.connect() as conn:
    r = conn.execute(sa.text("SELECT id, name FROM public.tenants"))
    rows = r.fetchall()
    print('public.tenants count:', len(rows))
    for row in rows:
        print(row)
