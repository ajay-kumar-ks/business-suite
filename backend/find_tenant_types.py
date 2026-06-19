from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT typname, oid FROM pg_type WHERE typname ILIKE '%tenant%';"))
    rows = res.fetchall()
    for r in rows:
        print(r)
    if not rows:
        print('no tenant types')
