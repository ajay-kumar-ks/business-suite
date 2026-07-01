-- Migration 001: Add pgvector + embedding columns + indexes
-- Run this on your Supabase SQL Editor or via migration tool
-- Part of the Nile → Supabase migration for RAG chatbot

-- ============================================================
-- 1. Enable pgvector extension
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. Add embedding vector column to each accounts table
--    Dimension: 1536 (OpenAI text-embedding-3-small)
--    Nullable: true (backfilled later, new rows get embedding on create)
-- ============================================================

-- Core accounting
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Transactions
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE income ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Accounts Receivable
ALTER TABLE customers ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Accounts Payable
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE vendor_payments ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Budgets
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE budget_lines ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ============================================================
-- 3. Create HNSW indexes for fast approximate nearest neighbor search
--    HNSW (Hierarchical Navigable Small World) indexes are faster
--    than IVFFlat for high-dimension vectors and don't require
--    a training step. Cosine distance is used since OpenAI
--    embeddings are normalized to unit length.
-- ============================================================

-- Core accounting
CREATE INDEX IF NOT EXISTS idx_coa_embedding
    ON chart_of_accounts USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_journals_embedding
    ON journal_entries USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_journal_lines_embedding
    ON journal_lines USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_ledger_embedding
    ON ledger_entries USING hnsw (embedding vector_cosine_ops);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_expenses_embedding
    ON expenses USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_income_embedding
    ON income USING hnsw (embedding vector_cosine_ops);

-- Accounts Receivable
CREATE INDEX IF NOT EXISTS idx_customers_embedding
    ON customers USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_invoices_embedding
    ON invoices USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_customer_payments_embedding
    ON customer_payments USING hnsw (embedding vector_cosine_ops);

-- Accounts Payable
CREATE INDEX IF NOT EXISTS idx_vendors_embedding
    ON vendors USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_bills_embedding
    ON bills USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_embedding
    ON vendor_payments USING hnsw (embedding vector_cosine_ops);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_embedding
    ON budgets USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_budget_lines_embedding
    ON budget_lines USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 4. Alternative: Use IVFFlat indexes (lower memory, needs training)
--    Uncomment this section and comment out HNSW above if you
--    prefer IVFFlat. Adjust `lists` based on expected row count:
--      - rows < 1K:   lists = 10
--      - rows < 10K:  lists = 100
--      - rows < 100K: lists = 500
--      - rows > 100K: lists = 1000
-- ============================================================
-- CREATE INDEX IF NOT EXISTS idx_coa_embedding
--     ON chart_of_accounts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX IF NOT EXISTS idx_journals_embedding
--     ON journal_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- ... repeat for all tables above ...

-- ============================================================
-- 5. Verify setup
-- ============================================================
-- Run this to confirm extensions and columns were added:
-- SELECT * FROM pg_extension WHERE extname = 'vector';
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE column_name = 'embedding' ORDER BY table_name;
