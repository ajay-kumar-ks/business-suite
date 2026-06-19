from app.core.database import engine
import sqlalchemy as sa
with engine.connect() as conn:
    print('\n-- pg_extension')
    r = conn.execute(sa.text('SELECT extname, extschema::regnamespace::text AS schema_name, extversion FROM pg_extension'))
    for row in r.fetchall():
        print(row)

    print('\n-- namespaces like nile')
    r = conn.execute(sa.text("SELECT nspname FROM pg_namespace WHERE nspname ILIKE '%nile%'"))
    for row in r.fetchall():
        print(row)

    print('\n-- functions in nile namespace')
    r = conn.execute(sa.text("SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname ILIKE '%nile%'"))
    for row in r.fetchall():
        print(row)

    print('\n-- search for '"nile"' in prosrc')
    r = conn.execute(sa.text("SELECT n.nspname, p.proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.prosrc ILIKE '%nile%';"))
    for row in r.fetchall():
        print(row)
