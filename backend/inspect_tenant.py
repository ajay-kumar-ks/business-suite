from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    res = conn.execute(sa.text("SELECT tenant_id::text as tenant_id, length(tenant_id::text) as len, pg_typeof(tenant_id) as typ FROM chart_of_accounts LIMIT 5"))
    for row in res:
        print(row)
