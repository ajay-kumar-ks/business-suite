import sqlalchemy as sa
from app.core.database import engine

TABLES = [
    'chart_of_accounts',
    'journal_entries',
    'journal_lines',
    'ledger_entries',
    'event_store',
    'tenants',
]

with engine.connect() as conn:
    print('=== Table type and rules/triggers ===')
    for table in TABLES:
        print(f'\nTable: public.{table}')
        r = conn.execute(sa.text("SELECT c.relkind, c.relname, n.nspname FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname=:table"), {'table': table})
        row = r.fetchone()
        print(' relkind:', row)
        r2 = conn.execute(sa.text("SELECT * FROM pg_rules WHERE schemaname='public' AND tablename=:table"), {'table': table})
        rules = r2.fetchall()
        print(' rules:', len(rules))
        for rule in rules:
            print('  ', rule)
        r3 = conn.execute(sa.text("SELECT tgname, tgenabled, tgtype FROM pg_trigger WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname=:table AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public'))"), {'table': table})
        triggers = r3.fetchall()
        print(' triggers:', len(triggers))
        for trig in triggers:
            print('  ', trig)

    print('\n=== Public tables and their _pdb counterparts ===')
    r = conn.execute(sa.text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema LIKE '%nile_internal%' OR table_name LIKE '%_pdb_%' ORDER BY table_schema, table_name"))
    for row in r.fetchall():
        print(row)

    print('\n=== `public.chart_of_accounts` columns ===')
    r = conn.execute(sa.text("SELECT column_name,data_type,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='chart_of_accounts' ORDER BY ordinal_position"))
    for row in r.fetchall():
        print(row)
