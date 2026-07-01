# Supabase Vector DB Migration Path for Business Suite

## Current state analysis

The backend is already a PostgreSQL/SQLAlchemy application, so moving to Supabase is mostly a connection and schema migration task rather than a full rewrite.

### Current database access layer
- Main DB wiring is in [backend/app/core/database.py](backend/app/core/database.py)
- Settings are defined in [backend/app/core/config.py](backend/app/core/config.py)
- Startup creates tables in [backend/app/main.py](backend/app/main.py)

### Important existing behavior
- The app uses SQLAlchemy and creates tables from model metadata.
- The current connection layer still contains Nile-specific logic that sets `nile.tenant_id` on new connections.
- The current config still points to a Nile API host in addition to a database URL.

### Existing modules and tables discovered from the ORM models
- Auth: `auth_users`
- HR: `roles`, `departments`, `attendance`, `leave_requests`, `employees`
- CRM: `contacts`, `tags`, `activities`, `pipelines`, `phases`, `pipeline_assignments`, `leads`, `clients`
- Accounts: `chart_of_accounts`, `journal_entries`, `journal_lines`, `ledger_entries`, `customers`, `invoices`, `customer_payments`, `vendors`, `bills`, `vendor_payments`, `budgets`, `budget_lines`, `expenses`, `income`
- Payments: `payments`
- Recruitment: `pipeline_templates`, `candidates`
- Tasks: `tasks`, `task_comments`, `task_activities`, `task_dependencies`, `sub_tasks`, `task_notifications`

### Vector-readiness status
- There is no existing pgvector or embedding storage in the current backend.
- The application is currently transactional and relational; semantic search and AI features would need a vector table or a document/embedding table.

---

## Recommended migration path

### Phase 1 — Prepare Supabase
1. Create a Supabase project.
2. In the SQL editor, enable the extension:

```sql
create extension if not exists vector;
```

3. Create a vector table for semantic search. Example:

```sql
create table if not exists search_documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

4. Add an HNSW index for similarity search:

```sql
create index if not exists search_documents_embedding_hnsw
on search_documents
using hnsw (embedding vector_cosine_ops);
```

### Phase 2 — Repoint the backend
1. Update [backend/app/core/config.py](backend/app/core/config.py) to use the Supabase Postgres connection string.
2. Update [backend/app/core/database.py](backend/app/core/database.py) to remove Nile-specific connection setup and use the Supabase engine directly.
3. Keep the existing SQLAlchemy models; they can continue to work on Supabase since Supabase is PostgreSQL.
4. If you still need multi-tenancy, replace the Nile-specific tenant hook with a company/tenant column in your tables or an application-level filter.

### Phase 3 — Migrate existing data
1. Export current data from the existing database.
2. Import it into Supabase.
3. Validate row counts and key relationships.
4. Re-run the app startup migrations and seed logic from [backend/app/main.py](backend/app/main.py).

### Phase 4 — Add embeddings
1. Decide which entities should be searchable semantically:
   - leads
   - contacts
   - tasks
   - employees
   - invoices / bills / payments
2. Generate embeddings from structured text and store them in `search_documents`.
3. Add a service endpoint to query nearest neighbors with cosine similarity.

---

## Suggested implementation order

### Minimal safe first step
- Move the relational data to Supabase first.
- Keep the app behavior unchanged.
- Do not add vector search yet.

### Next step
- Add `pgvector` support and a single `search_documents` table.
- Use it for AI search over CRM/HR/tasks data.

### Final step
- Replace any Nile-specific API usage and remove deprecated tenant settings.

---

## Files to change
- [backend/app/core/config.py](backend/app/core/config.py)
- [backend/app/core/database.py](backend/app/core/database.py)
- [backend/app/main.py](backend/app/main.py)
- Add a new embeddings service module under the backend app for Supabase vector search

---

## Practical migration notes
- Supabase is PostgreSQL + pgvector, so the object model can stay mostly the same.
- The biggest code change is removing the Nile tenant connection hook and switching the DB URL.
- A separate vector database service is not required if you use pgvector in Supabase.

If you want, the next step can be to implement the actual Supabase connection switch and a starter vector search service in the backend.
