from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    try:
        res = conn.execute(sa.text('SELECT * FROM chart_of_accounts LIMIT 1'))
        print(res.keys())
        print(res.fetchall())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('ERR', e)
