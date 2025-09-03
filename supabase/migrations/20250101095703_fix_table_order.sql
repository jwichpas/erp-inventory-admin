-- ============================================================================
-- PARCHE PARA CORREGIR ORDEN DE TABLAS - REFERENCIAS FALTANTES
-- ============================================================================
-- Fecha: 2025-01-01
-- Propósito: Agregar foreign keys que no se pudieron crear por orden incorrecto
-- ============================================================================

-- Agregar FK de receptions a purchase_docs (si no existe)
DO $$
BEGIN
    -- Solo agregar si la columna no tiene ya la FK
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_receptions_purchase_doc'
        AND table_name = 'receptions'
    ) THEN
        ALTER TABLE receptions 
        ADD CONSTRAINT fk_receptions_purchase_doc 
        FOREIGN KEY (purchase_doc_id) REFERENCES purchase_docs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Agregar cualquier otra FK que pudiera faltar por problemas de orden
DO $$
BEGIN
    -- Verificar y agregar FK de reception_items si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_reception_items_receptions'
        AND table_name = 'reception_items'
    ) THEN
        ALTER TABLE reception_items 
        ADD CONSTRAINT fk_reception_items_receptions 
        FOREIGN KEY (reception_id) REFERENCES receptions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- CREACIÓN DE VISTAS MATERIALIZADAS QUE FALTARON
-- ============================================================================

-- Solo crear si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_accounts_receivable') THEN
        EXECUTE '
        CREATE MATERIALIZED VIEW mv_accounts_receivable AS
        SELECT
            sd.company_id,
            sd.customer_id,
            p.fullname AS customer_name,
            SUM(sd.total - COALESCE((SELECT SUM(amount) FROM payments WHERE doc_type = ''SALE'' AND doc_id = sd.id), 0)) AS balance_due
        FROM sales_docs sd
        JOIN parties p ON p.id = sd.customer_id
        WHERE sd.deleted_at IS NULL
        GROUP BY sd.company_id, sd.customer_id, p.fullname';
        
        CREATE UNIQUE INDEX ON mv_accounts_receivable (company_id, customer_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_accounts_payable') THEN
        EXECUTE '
        CREATE MATERIALIZED VIEW mv_accounts_payable AS
        SELECT
            pd.company_id,
            pd.supplier_id,
            p.fullname AS supplier_name,
            SUM(pd.total - COALESCE((SELECT SUM(amount) FROM payments WHERE doc_type = ''PURCHASE'' AND doc_id = pd.id), 0)) AS balance_owed
        FROM purchase_docs pd
        JOIN parties p ON p.id = pd.supplier_id
        WHERE pd.deleted_at IS NULL
        GROUP BY pd.company_id, pd.supplier_id, p.fullname';
        
        CREATE UNIQUE INDEX ON mv_accounts_payable (company_id, supplier_id);
    END IF;
END $$;