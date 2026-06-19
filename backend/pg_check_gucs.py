from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    r = conn.execute(sa.text("SELECT name, setting, unit, vartype, source, sourcefile, sourceline FROM pg_settings WHERE name ILIKE '%nile%' OR name='shared_preload_libraries'"))
    rows = r.fetchall()
    for row in rows:
        print(row)
    print('\ncurrent_setting nile.tenant_id (if set)')
    try:
        r = conn.execute(sa.text("SELECT current_setting('nile.tenant_id', true)"))
        print(r.fetchone())
    except Exception as e:
        print('ERR', e)
