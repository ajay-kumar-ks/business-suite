import sqlalchemy as sa
from app.core.database import engine

with engine.connect() as conn:
    print('Searching for table names containing tenant or nile...')
    res = conn.execute(sa.text("SELECT schemaname, tablename FROM pg_tables WHERE tablename ILIKE '%tenant%' OR tablename ILIKE '%nile%' OR tablename ILIKE '%tenants%';"))
    rows = res.fetchall()
    if not rows:
        print('No matching tables found via pg_tables')
    else:
        for schema, tablename in rows:
            print('\nFound table:', schema, tablename)
            try:
                sample = conn.execute(sa.text(f'SELECT * FROM {schema}."{tablename}" LIMIT 5'))
                cols = [c for c in sample.keys()]
                print(' columns:', cols)
                for r in sample.fetchall():
                    print(' row:', r)
            except Exception as e:
                print(' sample query failed:', repr(e))

    # Also search for types and functions mentioning 'tenant'
    print('\nSearching pg_type for tenant-related types...')
    res = conn.execute(sa.text("SELECT typname FROM pg_type WHERE typname ILIKE '%tenant%' OR typname ILIKE '%nile%';"))
    trows = res.fetchall()
    for (typname,) in trows:
        print(' type:', typname)

    print('\nSearching pg_namespace for nile-like schemas...')
    res = conn.execute(sa.text("SELECT nspname FROM pg_namespace WHERE nspname ILIKE '%nile%' OR nspname ILIKE '%tenant%';"))
    for (n,) in res.fetchall():
        print(' namespace:', n)
