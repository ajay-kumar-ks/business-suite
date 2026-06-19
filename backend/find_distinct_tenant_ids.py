import sqlalchemy as sa
from app.core.database import engine

unique = set()
with engine.connect() as conn:
    q = sa.text("SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%tenant_id%' AND table_schema NOT IN ('pg_catalog','information_schema')")
    res = conn.execute(q)
    rows = res.fetchall()
    print('Found columns named tenant_id in:')
    for schema, table, col in rows:
        print(schema, table, col)
        try:
            r = conn.execute(sa.text(f'SELECT DISTINCT "{col}" FROM {schema}."{table}" WHERE "{col}" IS NOT NULL LIMIT 100'))
            for (val,) in r.fetchall():
                unique.add(str(val))
        except Exception as e:
            print(' query failed for', schema, table, repr(e))

print('\nUnique tenant_id values found (sample up to 200):')
for i, val in enumerate(sorted(unique)):
    print(i+1, val)

print('\nCount:', len(unique))
