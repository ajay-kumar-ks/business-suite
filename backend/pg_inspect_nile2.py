from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    print('\n-- extensions with schema')
    r = conn.execute(sa.text("SELECT e.extname, e.extversion, n.nspname as schema_name FROM pg_extension e LEFT JOIN pg_namespace n ON e.extnamespace = n.oid"))
    for row in r.fetchall():
        print(row)

    print('\n-- types matching tenant and their schema')
    r = conn.execute(sa.text("SELECT t.typname, n.nspname as schema_name, t.oid FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname ILIKE '%tenant%';"))
    for row in r.fetchall():
        print(row)

    print('\n-- find objects depending on these types (pg_depend)')
    r = conn.execute(sa.text("SELECT objid::regclass::text as obj, refobjid::regtype::text as ref FROM pg_depend WHERE refobjid IN (SELECT oid FROM pg_type WHERE typname ILIKE '%tenant%') LIMIT 50;"))
    for row in r.fetchall():
        print(row)

    print('\n-- search for extension '"nile"' in comments or names')
    r = conn.execute(sa.text("SELECT * FROM pg_extension WHERE extname ILIKE '%nile%'"))
    for row in r.fetchall():
        print(row)
    if not list(r):
        pass
