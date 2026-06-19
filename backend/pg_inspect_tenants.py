from app.core.database import engine
import sqlalchemy as sa

def run_query(conn, sql, params=None):
    print('\n-- SQL:', sql)
    res = conn.execute(sa.text(sql), params or {})
    rows = res.fetchall()
    for r in rows:
        print(r)
    if not rows:
        print('(no rows)')

with engine.connect() as conn:
    # 1. functions containing tenant
    sql1 = "SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) as defn FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.prosrc ILIKE '%tenant%' OR p.proname ILIKE '%tenant%';"
    run_query(conn, sql1)

    # 2. triggers referencing tenant
    sql2 = "SELECT n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid) as defn FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE pg_get_triggerdef(t.oid) ILIKE '%tenant%';"
    run_query(conn, sql2)

    # 3. types with tenant
    sql3 = "SELECT typname, typtype, oid FROM pg_type WHERE typname ILIKE '%tenant%';"
    run_query(conn, sql3)

    # 4. policies
    sql4 = "SELECT * FROM pg_policies;"
    run_query(conn, sql4)

    # 5. Show table metadata for specified tables
    tables = ['chart_of_accounts','journal_entries','vendors','invoices']
    for t in tables:
        print(f"\n== TABLE: {t} ==")
        qcols = "SELECT column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = :t ORDER BY ordinal_position"
        run_query(conn, qcols, {'t': t})
        qcons = "SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = :t LIMIT 1);"
        run_query(conn, qcons, {'t': t})
        qidx = "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = :t;"
        run_query(conn, qidx, {'t': t})

    # 6. check for app.current_tenant or related functions/GUCs
    qset = "SELECT name, setting, short_desc FROM pg_settings WHERE name ILIKE '%tenant%';"
    run_query(conn, qset)
    qfunc = "SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE p.proname ILIKE 'set_tenant%' OR p.proname ILIKE 'current_tenant%' OR p.proname ILIKE '%set_tenant%' OR p.proname ILIKE '%current_tenant%';"
    run_query(conn, qfunc)

    # Also check event triggers
    qev = "SELECT evtname, evtenabled, pg_get_event_triggerdef(oid) FROM pg_event_trigger;"
    run_query(conn, qev)
