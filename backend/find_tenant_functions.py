from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT proname, oidvectortypes(proargtypes) as args FROM pg_proc WHERE proname ILIKE '%tenant%';"))
    rows = res.fetchall()
    for r in rows:
        print(r)
    if not rows:
        print('no tenant functions')
