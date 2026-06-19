from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    try:
        res = conn.execute(sa.text("SELECT count(*) FROM chart_of_accounts WHERE tenant_id::text = '04e5e982-08f3-4c53-986e-f177430b0678'"))
        print(res.fetchone()[0])
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('ERR', e)
