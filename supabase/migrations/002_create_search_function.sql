-- Migration 002: Create search_accounts() RPC function
-- This function performs unified vector similarity search across
-- ALL accounts module tables and returns ranked results.
-- Called by the n8n RAG workflow (or directly from FastAPI).

-- ============================================================
-- 1. Create the search function
-- ============================================================

CREATE OR REPLACE FUNCTION search_accounts(
    query_embedding vector(1536),
    match_count int DEFAULT 10
)
RETURNS TABLE(
    content text,
    similarity float,
    table_name text,
    record_id int,
    record_metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    -- Chart of Accounts
    SELECT
        'Account ' || coa.account_code || ': ' || coa.account_name || ' (' || coa.account_type || ')' AS content,
        1 - (coa.embedding <=> query_embedding) AS similarity,
        'chart_of_accounts' AS table_name,
        coa.id AS record_id,
        jsonb_build_object(
            'account_code', coa.account_code,
            'account_name', coa.account_name,
            'account_type', coa.account_type,
            'is_active', coa.is_active
        ) AS record_metadata
    FROM chart_of_accounts coa
    WHERE coa.embedding IS NOT NULL
    ORDER BY coa.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Journal Entries
    SELECT
        'Journal: ' || COALESCE(je.reference, 'N/A') || ' — ' || COALESCE(je.description, '') || '. Status: ' || je.status || '. Date: ' || je.date::text AS content,
        1 - (je.embedding <=> query_embedding) AS similarity,
        'journal_entries' AS table_name,
        je.id AS record_id,
        jsonb_build_object(
            'reference', je.reference,
            'description', je.description,
            'status', je.status,
            'date', je.date
        ) AS record_metadata
    FROM journal_entries je
    WHERE je.embedding IS NOT NULL
    ORDER BY je.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Journal Lines
    SELECT
        'Journal Line: ' || COALESCE(jl.memo, 'No memo') || ' — Debit ₹' || jl.debit || ', Credit ₹' || jl.credit AS content,
        1 - (jl.embedding <=> query_embedding) AS similarity,
        'journal_lines' AS table_name,
        jl.id AS record_id,
        jsonb_build_object(
            'journal_id', jl.journal_id,
            'account_id', jl.account_id,
            'memo', jl.memo,
            'debit', jl.debit,
            'credit', jl.credit
        ) AS record_metadata
    FROM journal_lines jl
    WHERE jl.embedding IS NOT NULL
    ORDER BY jl.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Ledger Entries
    SELECT
        'Ledger Entry: Account #' || le.account_id || ' — Debit ₹' || le.debit || ', Credit ₹' || le.credit || ' on ' || le.posting_date::text AS content,
        1 - (le.embedding <=> query_embedding) AS similarity,
        'ledger_entries' AS table_name,
        le.id AS record_id,
        jsonb_build_object(
            'journal_id', le.journal_id,
            'account_id', le.account_id,
            'debit', le.debit,
            'credit', le.credit,
            'posting_date', le.posting_date
        ) AS record_metadata
    FROM ledger_entries le
    WHERE le.embedding IS NOT NULL
    ORDER BY le.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Expenses
    SELECT
        'Expense: ' || e.description || ' — ₹' || e.amount || ' on ' || e.expense_date::text || ' (Status: ' || e.status || ')' AS content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        'expenses' AS table_name,
        e.id AS record_id,
        jsonb_build_object(
            'description', e.description,
            'amount', e.amount,
            'expense_date', e.expense_date,
            'account_id', e.account_id,
            'reference', e.reference,
            'status', e.status
        ) AS record_metadata
    FROM expenses e
    WHERE e.embedding IS NOT NULL
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Income
    SELECT
        'Income: ' || i.description || ' — ₹' || i.amount || ' on ' || i.income_date::text || ' (Status: ' || i.status || ')' AS content,
        1 - (i.embedding <=> query_embedding) AS similarity,
        'income' AS table_name,
        i.id AS record_id,
        jsonb_build_object(
            'description', i.description,
            'amount', i.amount,
            'income_date', i.income_date,
            'account_id', i.account_id,
            'reference', i.reference,
            'status', i.status
        ) AS record_metadata
    FROM income i
    WHERE i.embedding IS NOT NULL
    ORDER BY i.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Customers
    SELECT
        'Customer: ' || c.name || COALESCE(' — Email: ' || c.email, '') || COALESCE(' — Phone: ' || c.phone, '') AS content,
        1 - (c.embedding <=> query_embedding) AS similarity,
        'customers' AS table_name,
        c.id AS record_id,
        jsonb_build_object(
            'name', c.name,
            'email', c.email,
            'phone', c.phone,
            'is_active', c.is_active
        ) AS record_metadata
    FROM customers c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Invoices
    SELECT
        'Invoice #' || inv.invoice_number || ': ₹' || inv.amount || ' (Paid: ₹' || inv.paid_amount || '). Status: ' || inv.status || '. Due: ' || COALESCE(inv.due_date::text, 'N/A') AS content,
        1 - (inv.embedding <=> query_embedding) AS similarity,
        'invoices' AS table_name,
        inv.id AS record_id,
        jsonb_build_object(
            'invoice_number', inv.invoice_number,
            'customer_id', inv.customer_id,
            'amount', inv.amount,
            'paid_amount', inv.paid_amount,
            'status', inv.status,
            'due_date', inv.due_date
        ) AS record_metadata
    FROM invoices inv
    WHERE inv.embedding IS NOT NULL
    ORDER BY inv.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Customer Payments
    SELECT
        'Customer Payment: ₹' || cp.amount || ' for Invoice #' || i.invoice_number || COALESCE(' (Ref: ' || cp.reference || ')', '') AS content,
        1 - (cp.embedding <=> query_embedding) AS similarity,
        'customer_payments' AS table_name,
        cp.id AS record_id,
        jsonb_build_object(
            'invoice_id', cp.invoice_id,
            'amount', cp.amount,
            'payment_date', cp.payment_date,
            'reference', cp.reference
        ) AS record_metadata
    FROM customer_payments cp
    LEFT JOIN invoices i ON i.id = cp.invoice_id
    WHERE cp.embedding IS NOT NULL
    ORDER BY cp.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Vendors
    SELECT
        'Vendor: ' || v.name || COALESCE(' — Email: ' || v.email, '') || COALESCE(' — Phone: ' || v.phone, '') AS content,
        1 - (v.embedding <=> query_embedding) AS similarity,
        'vendors' AS table_name,
        v.id AS record_id,
        jsonb_build_object(
            'name', v.name,
            'email', v.email,
            'phone', v.phone,
            'is_active', v.is_active
        ) AS record_metadata
    FROM vendors v
    WHERE v.embedding IS NOT NULL
    ORDER BY v.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Bills
    SELECT
        'Bill #' || b.bill_number || ': ₹' || b.amount || ' (Paid: ₹' || b.paid_amount || '). Status: ' || b.status || '. Due: ' || COALESCE(b.due_date::text, 'N/A') AS content,
        1 - (b.embedding <=> query_embedding) AS similarity,
        'bills' AS table_name,
        b.id AS record_id,
        jsonb_build_object(
            'bill_number', b.bill_number,
            'vendor_id', b.vendor_id,
            'amount', b.amount,
            'paid_amount', b.paid_amount,
            'status', b.status,
            'due_date', b.due_date
        ) AS record_metadata
    FROM bills b
    WHERE b.embedding IS NOT NULL
    ORDER BY b.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Vendor Payments
    SELECT
        'Vendor Payment: ₹' || vp.amount || ' for Bill #' || b.bill_number || COALESCE(' (Ref: ' || vp.reference || ')', '') AS content,
        1 - (vp.embedding <=> query_embedding) AS similarity,
        'vendor_payments' AS table_name,
        vp.id AS record_id,
        jsonb_build_object(
            'bill_id', vp.bill_id,
            'amount', vp.amount,
            'payment_date', vp.payment_date,
            'reference', vp.reference
        ) AS record_metadata
    FROM vendor_payments vp
    LEFT JOIN bills b ON b.id = vp.bill_id
    WHERE vp.embedding IS NOT NULL
    ORDER BY vp.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Budgets
    SELECT
        'Budget: ' || bgt.name || ' — FY ' || bgt.fiscal_year || ', Total: ₹' || bgt.total_amount || ' (Status: ' || bgt.status || ')' AS content,
        1 - (bgt.embedding <=> query_embedding) AS similarity,
        'budgets' AS table_name,
        bgt.id AS record_id,
        jsonb_build_object(
            'name', bgt.name,
            'fiscal_year', bgt.fiscal_year,
            'total_amount', bgt.total_amount,
            'status', bgt.status,
            'start_date', bgt.start_date,
            'end_date', bgt.end_date
        ) AS record_metadata
    FROM budgets bgt
    WHERE bgt.embedding IS NOT NULL
    ORDER BY bgt.embedding <=> query_embedding
    LIMIT match_count

    UNION ALL

    -- Budget Lines
    SELECT
        'Budget Line: Account #' || bl.account_id || ' — Allocated: ₹' || bl.allocated_amount || ', Spent: ₹' || bl.spent_amount || ' (' || bl.consumed_percentage || '%)' AS content,
        1 - (bl.embedding <=> query_embedding) AS similarity,
        'budget_lines' AS table_name,
        bl.id AS record_id,
        jsonb_build_object(
            'budget_id', bl.budget_id,
            'account_id', bl.account_id,
            'allocated_amount', bl.allocated_amount,
            'spent_amount', bl.spent_amount,
            'consumed_percentage', bl.consumed_percentage
        ) AS record_metadata
    FROM budget_lines bl
    WHERE bl.embedding IS NOT NULL
    ORDER BY bl.embedding <=> query_embedding
    LIMIT match_count

    -- Final ordering: return the globally top-K results across ALL tables
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ============================================================
-- 2. Grant execute permission (adjust role as needed)
-- ============================================================
GRANT EXECUTE ON FUNCTION search_accounts TO anon;
GRANT EXECUTE ON FUNCTION search_accounts TO authenticated;
GRANT EXECUTE ON FUNCTION search_accounts TO service_role;

-- ============================================================
-- 3. Verify the function was created
-- ============================================================
-- Run: SELECT * FROM information_schema.routines
-- WHERE routine_name = 'search_accounts';
