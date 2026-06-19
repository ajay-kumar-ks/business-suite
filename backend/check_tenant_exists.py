import uuid
from app.core.database import engine
import sqlalchemy as sa
tenant_uuid = uuid.UUID('04e5e982-08f3-4c53-986e-f177430b0678')
with engine.connect() as conn:
    res = conn.execute(sa.text('SELECT id, name FROM accounts_tenants WHERE id = :id'), {'id': tenant_uuid})
    rows = res.fetchall()
    print('rows:', rows)
