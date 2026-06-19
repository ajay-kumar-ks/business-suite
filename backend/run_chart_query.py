import uuid
from app.core.database import engine
import sqlalchemy as sa
tenant_uuid = uuid.UUID('04e5e982-08f3-4c53-986e-f177430b0678')
with engine.connect() as conn:
    try:
        res = conn.execute(sa.text('SELECT id, tenant_id, account_code, account_name FROM chart_of_accounts WHERE tenant_id = :id ORDER BY account_code'), {'id': tenant_uuid})
        print(res.fetchall())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('ERR', e)
