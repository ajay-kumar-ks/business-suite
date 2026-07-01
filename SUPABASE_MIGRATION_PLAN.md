# Nile → Supabase Migration & RAG Chatbot Implementation Plan

> **Created**: June 30, 2026  
> **Project**: Business Suite — Accounts Module  
> **Owner**: Adishhh

---

## Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database strategy** | Full migration to Supabase | Single PostgreSQL DB. pgvector + MCP built-in. Simpler than dual-DB. |
| **Embedding model** | OpenAI `text-embedding-3-small` | 1536 dimensions, best quality output, already have OpenRouter/OpenAI setup. |
| **Chatbot approach** | Pure RAG | Natural language Q&A over embedded financial data. No complex SQL generation needed. |
| **Orchestrator** | n8n (self-hosted) | Visual workflow builder for RAG pipeline, webhook triggers, LLM calls. |
| **MCP tools** | Supabase MCP + n8n MCP | AI agents can query Supabase directly and trigger n8n workflows. |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       Your FastAPI Backend                        │
│                                                                  │
│  ┌─────────────────────┐     ┌──────────────────────────────┐   │
│  │  SQLAlchemy ORM     │────►│  Supabase PostgreSQL          │   │
│  │  (accounts module)  │     │  + pgvector extension         │   │
│  │                     │     │  + Row Level Security         │   │
│  └──────────┬──────────┘     └──────────────┬───────────────┘   │
│             │                                │                   │
│  ┌──────────▼──────────┐                    │                   │
│  │  Event Bus          │  sync events        │                   │
│  │  (expense.created,  │────────────────────►│                   │
│  │   invoice.created,  │  embeddings         │                   │
│  │   journal.posted…)  │  generated on write  │                   │
│  └─────────────────────┘                     │                   │
│                                              │                   │
│  ┌─────────────────────┐                     │                   │
│  │  Chat Endpoint      │  user question       │                   │
│  │  POST /chat         │────────────────────►│  vector search     │
│  │                     │◄────────────────────│  top-K results     │
│  └──────────┬──────────┘                     │                   │
│             │                                │                   │
└─────────────┼────────────────────────────────┼───────────────────┘
              │                                │
              ▼                                │
    ┌─────────────────┐                       │
    │     n8n         │◄────── webhook ────────┘
    │  (RAG pipeline) │
    │                 │────► OpenAI (embed + LLM)
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   MCP Tools     │
    │  - Supabase MCP │
    │  - n8n MCP      │
    └─────────────────┘
```

---

## Phase 1: Database Migration to Supabase

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Copy connection string: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`
3. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 1.2 Migrate Schema & Data

**Option A: pg_dump/pg_restore (Recommended)**

```bash
# Dump from Nile
pg_dump "postgresql://user:pass@us-west-2.db.thenile.dev:5432/business_suite_db" \
  --schema-only -f schema.sql

# Dump data (excluding any Nile-specific tenant columns if needed)
pg_dump "postgresql://user:pass@us-west-2.db.thenile.dev:5432/business_suite_db" \
  --data-only -f data.sql

# Restore to Supabase
psql "postgresql://postgres:pass@db.ref.supabase.co:5432/postgres" < schema.sql
psql "postgresql://postgres:pass@db.ref.supabase.co:5432/postgres" < data.sql
```

**Option B: Python Migration Script**

If a full pg_dump isn't practical, write a Python script that:
1. Reads all rows from Nile via SQLAlchemy
2. Inserts them into Supabase via SQLAlchemy (using a second engine)

### 1.3 Add pgvector + Embedding Columns

Run this migration on Supabase after data is migrated:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to accounts tables
ALTER TABLE chart_of_accounts ADD COLUMN embedding vector(1536);
ALTER TABLE journal_entries ADD COLUMN embedding vector(1536);
ALTER TABLE journal_lines ADD COLUMN embedding vector(1536);
ALTER TABLE ledger_entries ADD COLUMN embedding vector(1536);
ALTER TABLE customers ADD COLUMN embedding vector(1536);
ALTER TABLE invoices ADD COLUMN embedding vector(1536);
ALTER TABLE customer_payments ADD COLUMN embedding vector(1536);
ALTER TABLE vendors ADD COLUMN embedding vector(1536);
ALTER TABLE bills ADD COLUMN embedding vector(1536);
ALTER TABLE vendor_payments ADD COLUMN embedding vector(1536);
ALTER TABLE expenses ADD COLUMN embedding vector(1536);
ALTER TABLE income ADD COLUMN embedding vector(1536);
ALTER TABLE budgets ADD COLUMN embedding vector(1536);
ALTER TABLE budget_lines ADD COLUMN embedding vector(1536);

-- Create HNSW vector indexes for fast similarity search
CREATE INDEX idx_coa_embedding ON chart_of_accounts USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_journals_embedding ON journal_entries USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_journal_lines_embedding ON journal_lines USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_ledger_embedding ON ledger_entries USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_customers_embedding ON customers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_invoices_embedding ON invoices USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_vendors_embedding ON vendors USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_bills_embedding ON bills USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_expenses_embedding ON expenses USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_income_embedding ON income USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_budgets_embedding ON budgets USING hnsw (embedding vector_cosine_ops);
```

> **Note**: HNSW indexes are faster for search but use more memory. For smaller datasets (< 100K rows), IVFFlat indexes are sufficient:  
> `CREATE INDEX idx_coa_embedding ON chart_of_accounts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`

### 1.4 Embedding Source Text Per Table

Each table's `embedding` column stores the vector representation of a **text blob** constructed from its meaningful fields:

| Table | Text Constructed for Embedding |
|-------|-------------------------------|
| `chart_of_accounts` | `"Account {account_code}: {account_name} ({account_type})"` |
| `journal_entries` | `"Journal {reference}: {description}. Date: {date}. Status: {status}."` |
| `journal_lines` | `"Line: {memo} — Debit ₹{debit}, Credit ₹{credit}"` |
| `ledger_entries` | `"Ledger: Account {account_id} — Debit ₹{debit}, Credit ₹{credit} on {posting_date}"` |
| `customers` | `"Customer: {name}. Email: {email}. Phone: {phone}. Address: {address}."` |
| `invoices` | `"Invoice #{invoice_number}: ₹{amount} (paid: ₹{paid_amount}). Status: {status}. Due: {due_date}."` |
| `customer_payments` | `"Payment ₹{amount} for Invoice #{invoice.invoice_number}. Ref: {reference}."` |
| `vendors` | `"Vendor: {name}. Email: {email}. Phone: {phone}."` |
| `bills` | `"Bill #{bill_number}: ₹{amount} (paid: ₹{paid_amount}). Status: {status}. Due: {due_date}."` |
| `vendor_payments` | `"Vendor Payment ₹{amount} for Bill #{bill.bill_number}. Ref: {reference}."` |
| `expenses` | `"Expense: {description}. Amount: ₹{amount}. Date: {expense_date}. Status: {status}."` |
| `income` | `"Income: {description}. Amount: ₹{amount}. Date: {income_date}. Status: {status}."` |
| `budgets` | `"Budget: {name}. FY {fiscal_year}. Total: ₹{total_amount}. Status: {status}."` |
| `budget_lines` | `"Budget Line: Account {account_id} — Allocated: ₹{allocated_amount}, Spent: ₹{spent_amount} ({consumed_percentage}%)"` |

---

## Phase 2: Embedding Sync Service

### 2.1 New Files to Create

#### `backend/app/modules/accounts/embedding_service.py`

A service that:
- Takes any model instance → constructs text → calls OpenAI embedding API → stores vector
- Handles batch operations
- Integrates with the existing event bus

**Key methods:**

```python
class EmbeddingService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def embed_text(self, text: str) -> list[float]:
        """Generate embedding vector via OpenAI."""
        resp = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return resp.data[0].embedding

    def build_text(self, model_instance) -> str:
        """Construct embedding text based on model type."""
        # Dispatch based on type(model_instance)
        ...

    def sync(self, db: Session, model_instance) -> None:
        """Generate + store embedding for a single record."""
        text = self.build_text(model_instance)
        embedding = self.embed_text(text)
        model_instance.embedding = embedding
        db.commit()
```

### 2.2 Event Bus Integration

Use your existing event bus events to trigger embedding syncs in real-time:

| Event Published | Triggers Embedding Sync For |
|----------------|----------------------------|
| `expense.created` | `expenses` row |
| `income.created` | `income` row |
| `invoice.created` | `invoices` row |
| `invoice.paid` | `invoices` (updated `paid_amount`) + `customer_payments` |
| `bill.created` | `bills` row |
| `bill.paid` | `bills` (updated `paid_amount`) + `vendor_payments` |
| `journal.posted` | `journal_entries` + `journal_lines` + `ledger_entries` |
| `budget.created` | `budgets` row |
| `budget.exceeded` | `budgets` (updated `spent_amount`) |

Register handlers like:

```python
# In embedding_service.py
def register_embedding_handlers():
    event_bus.subscribe("expense.created", handle_expense_created)
    event_bus.subscribe("invoice.created", handle_invoice_created)
    # ... etc
```

### 2.3 Model Changes

Add an `embedding` column to each SQLAlchemy model in `backend/app/modules/accounts/models.py`:

```python
# New import
from pgvector.sqlalchemy import Vector

# Add to each model class
embedding = Column(Vector(1536), nullable=True)
```

### 2.4 Register Handlers

In `backend/app/main.py` or the accounts module startup, call:

```python
from app.modules.accounts.embedding_service import register_embedding_handlers
register_embedding_handlers()
```

---

## Phase 3: Backfill Script

### `backend/scripts/backfill_embeddings.py`

A one-time script that reads **all existing data** from every accounts table, generates embeddings, and stores them.

```python
"""
Usage: python scripts/backfill_embeddings.py

Iterates through all accounts module tables and generates
OpenAI embeddings for rows that don't have one yet.
"""
```

**Flow:**
1. Connect to Supabase DB
2. For each table, query rows WHERE embedding IS NULL
3. Batch process: collect texts → call OpenAI embeddings API → UPDATE rows
4. Respect OpenAI rate limits (use `tenacity` for retries)
5. Output progress: "Backfilled 1500/1500 rows across 14 tables"

**Run it:**
```bash
cd backend
python scripts/backfill_embeddings.py
```

---

## Phase 4: RAG Chatbot — FastAPI + n8n

### 4.1 n8n Workflow 1: `data-sync`

Triggered by webhook from your FastAPI event bus.

```
[Webhook] → [OpenAI Embeddings] → [Supabase Update Row]
```

- **Webhook**: Receives `{ table, row_id, text }`
- **OpenAI**: Generates embedding for the text
- **Supabase**: `UPDATE {table} SET embedding = {vector} WHERE id = {row_id}`

### 4.2 n8n Workflow 2: `chat-query`

The core RAG pipeline, triggered by `POST /api/accounts/chat`.

```
[Webhook]  →  [OpenAI Embed]  →  [Supabase Vector Search]
    ↑                                    ↓
[Send Response]  ←  [OpenAI Chat]  ←  [Build Context]
```

Detailed steps:

| Step | n8n Node | Action |
|------|----------|--------|
| 1 | Webhook | Receive `{ question: "What's our cash position?" }` |
| 2 | Function | Normalize question, truncate if needed |
| 3 | HTTP Request (OpenAI) | `POST https://api.openai.com/v1/embeddings` → model: `text-embedding-3-small`, input: question |
| 4 | HTTP Request (Supabase) | `POST /rest/v1/rpc/search_accounts` — pass embedding vector, limit: 15 |
| 5 | Function | Format top results into context string |
| 6 | HTTP Request (OpenAI/OpenRouter) | `POST /v1/chat/completions` — system prompt + user question + context |
| 7 | Webhook Response | Return LLM answer |

### 4.3 Supabase RPC Function

Create a PostgreSQL function in Supabase for unified vector search across all tables:

```sql
CREATE OR REPLACE FUNCTION search_accounts(query_embedding vector(1536), match_count int DEFAULT 10)
RETURNS TABLE(content text, similarity float, table_name text, record_id int)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        'Account ' || coa.account_code || ': ' || coa.account_name || ' (' || coa.account_type || ')' AS content,
        1 - (coa.embedding <=> query_embedding) AS similarity,
        'chart_of_accounts' AS table_name,
        coa.id AS record_id
    FROM chart_of_accounts coa
    WHERE coa.embedding IS NOT NULL
    ORDER BY coa.embedding <=> query_embedding
    LIMIT match_count;

    -- Union with other tables
    UNION ALL
    SELECT
        'Journal: ' || je.reference || ' — ' || je.description AS content,
        1 - (je.embedding <=> query_embedding),
        'journal_entries',
        je.id
    FROM journal_entries je
    WHERE je.embedding IS NOT NULL
    ORDER BY je.embedding <=> query_embedding
    LIMIT match_count;

    UNION ALL
    SELECT
        'Customer: ' || c.name || ' — ' || c.email AS content,
        1 - (c.embedding <=> query_embedding),
        'customers',
        c.id
    FROM customers c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;

    -- ... repeat for other tables (expenses, income, invoices, bills, vendors, budgets)

    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
```

### 4.4 FastAPI Chat Endpoint

Add to `backend/app/modules/accounts/routers.py`:

```python
@router.post("/chat")
async def chat_with_accounts(
    data: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Accept a natural language question about accounts data.
    Forwards to n8n RAG workflow (or handles RAG in-house)
    and returns the AI-generated answer.
    """
    # Option A: Forward to n8n
    response = requests.post(
        settings.N8N_CHAT_WEBHOOK_URL,
        json={"question": data.question, "session_id": data.session_id}
    )
    return response.json()

    # Option B: Handle in-house (direct Supabase vector search + OpenAI)
    # embedding_service = EmbeddingService()
    # query_embedding = embedding_service.embed_text(data.question)
    # results = db.execute(
    #     text("SELECT * FROM search_accounts(:query_embedding, 10)"),
    #     {"query_embedding": str(query_embedding.tolist())}
    # ).fetchall()
    # context = format_context(results)
    # answer = call_llm(context, data.question)
    # return {"answer": answer, "sources": results}
```

New schemas in `backend/app/modules/accounts/chat_schemas.py`:

```python
class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    answer: str
    sources: list[dict] | None = None
```

### 4.5 System Prompt for RAG

```text
You are a financial accounting assistant for the Business Suite application.
You have access to the user's accounting data retrieved via vector search.

Answer the user's question using ONLY the provided context data.
If the context does not contain enough information, say so — do not invent numbers.

The context contains financial records like:
- Chart of Accounts entries
- Journal entries and their line items
- Ledger entries
- Customers, invoices, and payments (Accounts Receivable)
- Vendors, bills, and payments (Accounts Payable)
- Expenses and income records
- Budgets and budget consumption

Be specific: cite exact amounts (₹), dates, reference numbers, and account names.
Keep answers concise but complete.
```

---

## Phase 5: n8n Setup

### 5.1 Install n8n

```bash
# Self-host with Docker (recommended)
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_SECURE_COOKIE=false \
  -e WEBHOOK_URL=https://your-domain.com \
  n8nio/n8n

# Access at: http://localhost:5678
```

### 5.2 Required Credentials in n8n

| Credential | Type | Used For |
|------------|------|----------|
| OpenAI API | API Key | Embeddings + Chat Completions |
| Supabase | Service Role Key | REST API queries + vector search |
| Webhook | — | Receive requests from FastAPI |

### 5.3 Environment Variables to Add

Add to your `.env` / n8n config:

```env
# OpenAI (or use OpenRouter endpoint)
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...  # Service role key (NOT anon key)

# n8n
N8N_CHAT_WEBHOOK_URL=http://localhost:5678/webhook/chat-query
N8N_SYNC_WEBHOOK_URL=http://localhost:5678/webhook/data-sync

# FastAPI
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
```

---

## Phase 6: MCP Tools (Optional Enhancement)

### 6.1 Supabase MCP Server

Allows AI agents (Claude Desktop, Cursor, etc.) to directly interact with Supabase:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@anthropic-ai/mcp-server-supabase",
        "--project-ref", "your-project-ref",
        "--service-role-key", "eyJhbGciOi..."
      ]
    }
  }
}
```

**Capabilities**:
- Run SQL queries directly
- Read/write tables
- Manage migrations
- Query vector store

### 6.2 n8n MCP Integration

n8n workflows can be exposed as MCP tools, allowing AI agents to:

- Trigger the chat RAG workflow
- Run periodic data syncs
- Execute admin queries

---

## Phase 7: Testing & Validation

### Unit Tests

| Test | What It Verifies |
|------|------------------|
| `test_embedding_service.py` | Text construction, API call, vector storage |
| `test_vector_search.py` | Similarity search returns correct results |
| `test_chat_endpoint.py` | Full RAG pipeline returns valid answers |
| `test_event_sync.py` | Event bus triggers embedding sync correctly |

### Manual Testing Checklist

- [ ] Run backfill script — all rows get embeddings
- [ ] Create a new expense via API — embedding generated automatically
- [ ] Ask "Show me my largest expenses" — RAG returns relevant results
- [ ] Ask "What unpaid invoices do I have?" — RAG returns invoices with `status != paid`
- [ ] Search for "Acme Corp" — finds customer, invoices, related journal entries
- [ ] Verify vector search speed (< 500ms for queries)

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `.env` | Modify | Add `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `N8N_*` |
| `backend/app/core/config.py` | Modify | Add new settings for Supabase, n8n, OpenAI embedding model |
| `backend/app/core/database.py` | Modify | Add Supabase connection engine config |
| `backend/requirements.txt` | Modify | Add `pgvector`, `supabase`, `openai`, `tenacity` |
| `backend/app/modules/accounts/models.py` | Modify | Add `embedding` Column (Vector) to all 14 models |
| `backend/app/modules/accounts/embedding_service.py` | **New** | Embedding generation and sync logic |
| `backend/app/modules/accounts/routers.py` | Modify | Add `POST /chat` endpoint |
| `backend/app/modules/accounts/chat_schemas.py` | **New** | Chat request/response Pydantic models |
| `backend/app/modules/accounts/__init__.py` | Modify | Register event handlers for embedding sync |
| `backend/app/main.py` | Modify | Call `register_embedding_handlers()` on startup |
| `backend/scripts/backfill_embeddings.py` | **New** | One-time backfill for existing data |
| `supabase/migrations/001_add_vector_columns.sql` | **New** | Migration SQL for pgvector + indexes |
| `supabase/migrations/002_create_search_function.sql` | **New** | `search_accounts()` RPC function |

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|-------------|
| **Phase 1:** DB Migration + Schema | 1–2 days | Supabase project access |
| **Phase 2:** Embedding Sync Service | 1–2 days | Phase 1 complete |
| **Phase 3:** Backfill Script | 0.5 day | Phase 1 + 2 complete |
| **Phase 4:** RAG Chatbot (n8n + endpoint) | 1–2 days | Phase 2 + 3 complete |
| **Phase 5:** n8n Setup + Workflows | 0.5 day | Phase 4 |
| **Phase 6:** MCP Tools | 0.5 day | Phase 1 complete (optional) |
| **Phase 7:** Testing | 1 day | All phases |
| **Total** | **5–9 days** | |

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| OpenAI API costs for backfill | Batch embeddings (cost ~$0.10 per 10K rows for 1536-dim model). Budget accordingly. |
| Embedding sync latency on write | Run sync in background task (Celery/Redis queue or FastAPI BackgroundTasks). |
| Vector search quality with small datasets (< 100 rows) | Use exact nearest neighbor (`<=>` operator) instead of HNSW/IVFFlat indexes for small data. |
| OpenAI API key not configured | Make embedding optional — fall back gracefully if no key is set. |
| n8n self-hosted downtime | Optionally run RAG in-house (directly in FastAPI) as fallback. |
