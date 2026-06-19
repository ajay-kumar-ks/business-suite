import uuid
import sqlalchemy as sa
from app.core.database import engine, SessionLocal, current_tenant

TENANT = uuid.UUID('04e5e982-08f3-4c53-986e-f177430b0678')

print('Before setting context:')
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT current_setting('nile.tenant_id', true)"))
    print('engine current_setting:', res.fetchone())

print('\nSetting current_tenant contextvar to', TENANT)
token = current_tenant.set(TENANT)

try:
    with SessionLocal() as db:
        res = db.execute(sa.text("SELECT current_setting('nile.tenant_id', true)"))
        print('session current_setting:', res.fetchone())
        try:
            rows = db.execute(sa.text('SELECT id, tenant_id, account_code, account_name FROM chart_of_accounts LIMIT 1')).fetchall()
            print('chart_of_accounts row:', rows)
        except Exception as e:
            print('chart query error:', repr(e))
finally:
    current_tenant.reset(token)

print('\nAfter reset:')
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT current_setting('nile.tenant_id', true)"))
    print('engine current_setting after reset:', res.fetchone())
