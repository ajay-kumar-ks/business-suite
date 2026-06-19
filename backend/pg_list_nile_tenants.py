import sqlalchemy as sa
from app.core.database import engine

TABLES = [
    ('public','tenants'),
    ('public','accounts_tenants'),
    ('auth','tenant_oidc_relying_parties'),
    ('auth','tenant_oidc_auth_attempts'),
    ('users','tenant_users'),
]

with engine.connect() as conn:
    for schema, table in TABLES:
        try:
            print(f'\nQuerying {schema}.{table} ...')
            r = conn.execute(sa.text(f'SELECT * FROM {schema}."{table}" LIMIT 50'))
            cols = r.keys()
            rows = r.fetchall()
            print(' columns:', cols)
            for row in rows:
                print(row)
        except Exception as e:
            print(' failed:', repr(e))

    # Also inspect __internal.nile_enum_name and public.tenants id types
    try:
        print('\nInspecting public.tenants id type:')
        r = conn.execute(sa.text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants'"))
        for row in r.fetchall():
            print(row)
    except Exception as e:
        print(' failed:', repr(e))
