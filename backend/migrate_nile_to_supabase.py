import argparse
import importlib
import json
import os
import sys
import traceback
import uuid
from datetime import date, datetime, time
from typing import Dict, List, Optional, Sequence, Set, Tuple

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import execute_values

from app.core.base import Base

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for env_path in [os.path.join(ROOT_DIR, ".env"), os.path.join(ROOT_DIR, ".env.local"), os.path.join(ROOT_DIR, "backend", ".env")]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=False)


DEFAULT_SKIP_TABLES = {
    "alembic_version",
    "spatial_ref_sys",
    "search_documents",
}


def quote_ident(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def connect(url: str):
    if not url:
        raise RuntimeError("A database URL is required")
    return psycopg2.connect(url)


def register_models() -> None:
    for module_name in [
        "app.modules.auth.db_models",
        "app.modules.hr.db_models",
        "app.modules.crm.db_models",
        "app.modules.accounts.models",
        "app.modules.accounts.ap_models",
        "app.modules.accounts.ar_models",
        "app.modules.accounts.budget_models",
        "app.modules.accounts.transaction_models",
        "app.modules.payments.db_models",
        "app.modules.recruitment.db_models",
        "app.modules.tasks.db_models",
    ]:
        importlib.import_module(module_name)


def get_table_columns(conn, table: str) -> List[Tuple]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name, data_type, udt_name, is_nullable, column_default,
                   character_maximum_length, numeric_precision, numeric_scale
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name=%s
            ORDER BY ordinal_position
            """,
            (table,),
        )
        return cur.fetchall()


def get_primary_key_columns(conn, table: str) -> List[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema='public' AND tc.table_name=%s AND tc.constraint_type='PRIMARY KEY'
            ORDER BY kcu.ordinal_position
            """,
            (table,),
        )
        return [row[0] for row in cur.fetchall()]


def get_foreign_key_columns(conn, table: str) -> List[Tuple[str, str, str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema='public' AND tc.table_name=%s AND tc.constraint_type='FOREIGN KEY'
            ORDER BY kcu.ordinal_position
            """,
            (table,),
        )
        return [(row[0], row[1], row[2]) for row in cur.fetchall()]


def build_column_definition(column_row: Tuple) -> str:
    column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale = column_row
    normalized_type = (data_type or udt_name or "text").lower()
    if normalized_type in {"character varying", "varchar"}:
        type_sql = f"varchar({character_maximum_length})" if character_maximum_length else "varchar"
    elif normalized_type in {"character", "bpchar"}:
        type_sql = f"char({character_maximum_length})" if character_maximum_length else "char"
    elif normalized_type in {"numeric", "decimal", "numeric"}:
        if numeric_precision is not None and numeric_scale is not None:
            type_sql = f"numeric({numeric_precision},{numeric_scale})"
        elif numeric_precision is not None:
            type_sql = f"numeric({numeric_precision})"
        else:
            type_sql = "numeric"
    elif normalized_type in {"timestamp without time zone", "timestamp with time zone"}:
        type_sql = normalized_type
    elif normalized_type == "time without time zone":
        type_sql = "time"
    elif normalized_type == "time with time zone":
        type_sql = "timetz"
    elif normalized_type == "integer":
        type_sql = "integer"
    elif normalized_type == "bigint":
        type_sql = "bigint"
    elif normalized_type == "smallint":
        type_sql = "smallint"
    elif normalized_type == "boolean":
        type_sql = "boolean"
    elif normalized_type == "text":
        type_sql = "text"
    elif normalized_type == "uuid":
        type_sql = "uuid"
    elif normalized_type == "jsonb":
        type_sql = "jsonb"
    elif normalized_type == "json":
        type_sql = "json"
    elif normalized_type == "bytea":
        type_sql = "bytea"
    elif normalized_type == "date":
        type_sql = "date"
    else:
        type_sql = udt_name or data_type or "text"

    parts = [quote_ident(column_name), type_sql]
    if column_default and not str(column_default).startswith("nextval(") and "uuid_generate_v7" not in str(column_default):
        parts.append(f"DEFAULT {column_default}")
    if is_nullable == "NO":
        parts.append("NOT NULL")
    return " ".join(parts)


def build_create_table_sql(source_conn, table: str) -> str:
    columns = get_table_columns(source_conn, table)
    primary_keys = get_primary_key_columns(source_conn, table)
    foreign_keys = get_foreign_key_columns(source_conn, table)

    column_defs = [build_column_definition(col) for col in columns]
    if primary_keys:
        column_defs.append(
            "PRIMARY KEY (" + ", ".join(quote_ident(col) for col in primary_keys) + ")"
        )
    for local_col, ref_table, ref_col in foreign_keys:
        column_defs.append(
            f"FOREIGN KEY ({quote_ident(local_col)}) REFERENCES {quote_ident(ref_table)} ({quote_ident(ref_col)})"
        )

    body = ",\n  ".join(column_defs)
    return f"CREATE TABLE IF NOT EXISTS {quote_ident(table)} (\n  {body}\n)"


def create_target_schema(source_conn, target_conn) -> None:
    tables = [table for table in get_public_tables(source_conn) if table not in DEFAULT_SKIP_TABLES]
    with target_conn.cursor() as cur:
        for table in tables:
            cur.execute(f"DROP TABLE IF EXISTS {quote_ident(table)} CASCADE")
            ddl = build_create_table_sql(source_conn, table)
            cur.execute(ddl)
    target_conn.commit()


def get_public_tables(conn) -> List[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        return [row[0] for row in cur.fetchall()]


def get_columns(conn, table: str) -> List[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema='public' AND table_name=%s
            ORDER BY ordinal_position
            """,
            (table,),
        )
        return [row[0] for row in cur.fetchall()]


def get_primary_key(conn, table: str) -> List[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema='public' AND tc.table_name=%s AND tc.constraint_type='PRIMARY KEY'
            ORDER BY kcu.ordinal_position
            """,
            (table,),
        )
        return [row[0] for row in cur.fetchall()]


def get_foreign_key_dependencies(conn, tables: Sequence[str]) -> Dict[str, Set[str]]:
    table_set = set(tables)
    deps: Dict[str, Set[str]] = {table: set() for table in tables}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT tc.table_name, ccu.table_name AS ref_table
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
            WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY'
            """
        )
        for table_name, ref_table in cur.fetchall():
            if table_name in table_set and ref_table in table_set:
                deps[table_name].add(ref_table)
    return deps


def topological_table_order(tables: Sequence[str], dependencies: Dict[str, Set[str]]) -> List[str]:
    indegree = {table: len(dependencies[table]) for table in tables}
    dependents: Dict[str, Set[str]] = {table: set() for table in tables}
    for table, parents in dependencies.items():
        for parent in parents:
            dependents.setdefault(parent, set()).add(table)

    ready = [table for table, degree in indegree.items() if degree == 0]
    ready.sort()
    ordered: List[str] = []
    while ready:
        current = ready.pop(0)
        ordered.append(current)
        for child in sorted(dependents.get(current, set())):
            indegree[child] -= 1
            if indegree[child] == 0:
                ready.append(child)
                ready.sort()

    if len(ordered) != len(tables):
        remaining = [table for table in tables if table not in ordered]
        remaining.sort()
        ordered.extend(remaining)
    return ordered


def normalize_value(value):
    if value is None:
        return None
    if isinstance(value, (datetime, date, time)):
        return value
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return value


def copy_table(source_conn, target_conn, table: str, batch_size: int, dry_run: bool) -> int:
    columns = get_columns(source_conn, table)
    if not columns:
        return 0

    pk_columns = get_primary_key(source_conn, table)

    select_sql = f"SELECT {', '.join(quote_ident(col) for col in columns)} FROM {quote_ident(table)}"
    with source_conn.cursor() as src_cur:
        src_cur.execute(select_sql)
        rows_copied = 0
        while True:
            rows = src_cur.fetchmany(batch_size)
            if not rows:
                break
            if dry_run:
                rows_copied += len(rows)
                continue

            values = []
            for row in rows:
                normalized = []
                for idx, value in enumerate(row):
                    normalized.append(normalize_value(value))
                values.append(tuple(normalized))

            column_sql = ", ".join(quote_ident(col) for col in columns)
            placeholders = ", ".join(["%s"] * len(columns))
            if pk_columns:
                conflict_columns = ", ".join(quote_ident(col) for col in pk_columns)
                update_columns = [col for col in columns if col not in pk_columns]
                update_sql = ", ".join(
                    f"{quote_ident(col)} = EXCLUDED.{quote_ident(col)}" for col in update_columns
                )
                insert_sql = (
                    f"INSERT INTO {quote_ident(table)} ({column_sql}) VALUES %s "
                    f"ON CONFLICT ({conflict_columns}) DO UPDATE SET {update_sql}"
                )
            else:
                insert_sql = f"INSERT INTO {quote_ident(table)} ({column_sql}) VALUES %s"

            with target_conn.cursor() as tgt_cur:
                execute_values(tgt_cur, insert_sql, values, page_size=batch_size)
            target_conn.commit()
            rows_copied += len(values)
    return rows_copied


def migrate(source_url: str, target_url: str, tables: Optional[Sequence[str]] = None, batch_size: int = 500, dry_run: bool = False) -> None:
    source_conn = connect(source_url)
    target_conn = connect(target_url)
    try:
        available_tables = [table for table in get_public_tables(source_conn) if table not in DEFAULT_SKIP_TABLES]
        if tables:
            selected_tables = [table for table in tables if table in available_tables]
            missing_tables = [table for table in tables if table not in available_tables]
            if missing_tables:
                print(f"[WARN] Missing source tables: {', '.join(missing_tables)}")
        else:
            selected_tables = available_tables

        if not selected_tables:
            raise RuntimeError("No migratable tables found")

        dependencies = get_foreign_key_dependencies(source_conn, selected_tables)
        ordered_tables = topological_table_order(selected_tables, dependencies)
        print(f"[INFO] Migrating {len(ordered_tables)} tables")

        create_target_schema(source_conn, target_conn)

        for table in ordered_tables:
            print(f"[INFO] Processing {table}")
            if dry_run:
                print(f"[DRY RUN] Would copy {table}")
                continue
            copied = copy_table(source_conn, target_conn, table, batch_size=batch_size, dry_run=False)
            print(f"[OK] Copied {copied} rows into {table}")
    finally:
        source_conn.close()
        target_conn.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate tables from Nile/Postgres into Supabase/Postgres")
    parser.add_argument("--source-url", default=os.getenv("NILE_DATABASE_URL") or os.getenv("SOURCE_DATABASE_URL"))
    parser.add_argument("--target-url", default=os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL"))
    parser.add_argument("--tables", nargs="*", default=None)
    parser.add_argument("--batch-size", type=int, default=500)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.source_url:
        raise SystemExit("Set NILE_DATABASE_URL or SOURCE_DATABASE_URL before running the migration")
    if not args.target_url:
        raise SystemExit("Set SUPABASE_DATABASE_URL or DATABASE_URL before running the migration")

    try:
        migrate(
            source_url=args.source_url,
            target_url=args.target_url,
            tables=args.tables,
            batch_size=args.batch_size,
            dry_run=args.dry_run,
        )
    except Exception as exc:
        print(f"[ERROR] Migration failed: {exc}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
