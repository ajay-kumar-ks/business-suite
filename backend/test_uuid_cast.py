from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    try:
        res = conn.execute(sa.text("SELECT '04e5e982-08f3-4c53-986e-f177430b0678'::uuid"))
        print(res.fetchall())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('ERR', e)
