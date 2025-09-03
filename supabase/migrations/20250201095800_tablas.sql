-- ============================================================================
-- MIGRACIÓN CORRECTIVA Y EXTENSIÓN DEL ESQUEMA ERP
-- ============================================================================
-- Fecha: 2025-02-01
-- Propósito: Corregir errores identificados y agregar funcionalidades POS
-- Arquitecto: Sistema ERP - Revisión Completa
-- ============================================================================

-- PASO 1: CORRECCIONES CRÍTICAS
-- ============================================================================

-- Crear tabla de unidades de medida que falta
CREATE TABLE IF NOT EXISTS sunat.cat_06_unidades_medida (
    code VARCHAR(10) PRIMARY KEY,
    descripcion TEXT NOT NULL,
    simbolo VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar unidades de medida básicas de SUNAT

-- Función faltante para actualizar saldos de almacén
CREATE OR REPLACE FUNCTION update_warehouse_stock_balance(
    p_warehouse_id UUID,
    p_product_id UUID,
    p_new_balance NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO warehouse_stock (warehouse_id, product_id, balance_qty)
    VALUES (p_warehouse_id, p_product_id, p_new_balance)
    ON CONFLICT (warehouse_id, product_id) 
    DO UPDATE SET 
        balance_qty = EXCLUDED.balance_qty;
END;
$$;

-- PASO 2: SISTEMA PUNTO DE VENTA (POS)
-- ============================================================================

-- Tabla principal para sesiones POS
CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    
    -- Información de la sesión
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_amount NUMERIC(18,6) NOT NULL DEFAULT 0,
    closing_amount NUMERIC(18,6),
    expected_amount NUMERIC(18,6),
    difference NUMERIC(18,6),
    
    -- Estado y metadatos
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'SUSPENDED')),
    notes TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_pos_session_amounts CHECK (
        (status = 'CLOSED' AND closed_at IS NOT NULL AND closing_amount IS NOT NULL)
        OR (status IN ('OPEN', 'SUSPENDED'))
    )
);

-- Índices para pos_sessions
CREATE INDEX IF NOT EXISTS idx_pos_sessions_company_status ON pos_sessions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_user_status ON pos_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_warehouse ON pos_sessions(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON pos_sessions(opened_at);

-- Trigger para pos_sessions
CREATE TRIGGER update_pos_sessions_updated_at 
    BEFORE UPDATE ON pos_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION trigger_set_timestamp();

-- Tabla para pagos en POS
CREATE TABLE IF NOT EXISTS public.pos_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_doc_id UUID REFERENCES sales_docs(id) ON DELETE CASCADE,
    pos_session_id UUID REFERENCES pos_sessions(id) ON DELETE CASCADE,
    
    -- Información del pago
    payment_type TEXT NOT NULL CHECK (payment_type IN ('CASH', 'CARD', 'TRANSFER', 'WALLET', 'CHECK', 'OTHER')),
    amount NUMERIC(18,6) NOT NULL CHECK (amount > 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',
    exchange_rate NUMERIC(18,6) DEFAULT 1,
    
    -- Información específica del método de pago
    reference TEXT, -- Número de referencia/voucher
    card_type TEXT, -- VISA, MASTERCARD, etc.
    card_last_four VARCHAR(4), -- Últimos 4 dígitos
    auth_code TEXT, -- Código de autorización
    terminal_id TEXT, -- ID del terminal POS
    
    -- Metadatos
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pos_payments
CREATE INDEX IF NOT EXISTS idx_pos_payments_sales_doc ON pos_payments(sales_doc_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_session ON pos_payments(pos_session_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_type_date ON pos_payments(payment_type, processed_at);

-- Tabla para estadísticas y métricas de POS
CREATE TABLE IF NOT EXISTS public.pos_session_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES pos_sessions(id) ON DELETE CASCADE,
    
    -- Métricas de ventas
    total_transactions INTEGER DEFAULT 0,
    total_sales_amount NUMERIC(18,6) DEFAULT 0,
    total_tax_amount NUMERIC(18,6) DEFAULT 0,
    
    -- Métricas por método de pago
    cash_transactions INTEGER DEFAULT 0,
    cash_amount NUMERIC(18,6) DEFAULT 0,
    card_transactions INTEGER DEFAULT 0,
    card_amount NUMERIC(18,6) DEFAULT 0,
    other_transactions INTEGER DEFAULT 0,
    other_amount NUMERIC(18,6) DEFAULT 0,
    
    -- Métricas de productos
    total_items_sold INTEGER DEFAULT 0,
    avg_ticket_size NUMERIC(18,6) DEFAULT 0,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para calcular estadísticas de sesión POS
CREATE OR REPLACE FUNCTION calculate_pos_session_stats(p_session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    v_stats RECORD;
BEGIN
    -- Calcular estadísticas principales
    SELECT 
        COUNT(sd.id) as total_transactions,
        COALESCE(SUM(sd.total), 0) as total_sales,
        COALESCE(SUM(sd.total_igv), 0) as total_tax,
        COALESCE(SUM((
            SELECT SUM(sdi.quantity) 
            FROM sales_doc_items sdi 
            WHERE sdi.sales_doc_id = sd.id
        )), 0) as total_items,
        COALESCE(AVG(sd.total), 0) as avg_ticket
    INTO v_stats
    FROM sales_docs sd
    WHERE sd.pos_session_id = p_session_id
    AND sd.deleted_at IS NULL;
    
    -- Construir JSON result
    result := json_build_object(
        'totalTransactions', COALESCE(v_stats.total_transactions, 0),
        'totalSales', COALESCE(v_stats.total_sales, 0),
        'totalTax', COALESCE(v_stats.total_tax, 0),
        'totalItems', COALESCE(v_stats.total_items, 0),
        'avgTicket', COALESCE(v_stats.avg_ticket, 0),
        'sessionId', p_session_id
    );
    
    -- Actualizar o insertar estadísticas
    INSERT INTO pos_session_stats (
        session_id, total_transactions, total_sales_amount, 
        total_tax_amount, total_items_sold, avg_ticket_size, calculated_at
    ) VALUES (
        p_session_id, v_stats.total_transactions, v_stats.total_sales,
        v_stats.total_tax, v_stats.total_items, v_stats.avg_ticket, NOW()
    ) ON CONFLICT (session_id) DO UPDATE SET
        total_transactions = EXCLUDED.total_transactions,
        total_sales_amount = EXCLUDED.total_sales_amount,
        total_tax_amount = EXCLUDED.total_tax_amount,
        total_items_sold = EXCLUDED.total_items_sold,
        avg_ticket_size = EXCLUDED.avg_ticket_size,
        calculated_at = NOW();
    
    RETURN result;
END;
$$;

-- Función para obtener estadísticas de sesión actual
CREATE OR REPLACE FUNCTION get_pos_session_stats(p_session_id UUID)
RETURNS TABLE(
    session_id UUID,
    today_transactions INTEGER,
    today_sales NUMERIC,
    today_tax NUMERIC,
    cash_sales NUMERIC,
    card_sales NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH session_sales AS (
        SELECT 
            sd.pos_session_id,
            COUNT(*) as transactions,
            COALESCE(SUM(sd.total), 0) as total_sales,
            COALESCE(SUM(sd.total_igv), 0) as total_tax
        FROM sales_docs sd
        WHERE sd.pos_session_id = p_session_id
          AND sd.deleted_at IS NULL
        GROUP BY sd.pos_session_id
    ),
    payment_breakdown AS (
        SELECT
            pp.pos_session_id,
            SUM(CASE WHEN pp.payment_type = 'CASH' THEN pp.amount ELSE 0 END) as cash_amount,
            SUM(CASE WHEN pp.payment_type IN ('CARD', 'TRANSFER', 'WALLET') THEN pp.amount ELSE 0 END) as card_amount
        FROM pos_payments pp
        WHERE pp.pos_session_id = p_session_id
        GROUP BY pp.pos_session_id
    )
    SELECT 
        p_session_id,
        COALESCE(ss.transactions, 0)::INTEGER,
        COALESCE(ss.total_sales, 0),
        COALESCE(ss.total_tax, 0),
        COALESCE(pb.cash_amount, 0),
        COALESCE(pb.card_amount, 0)
    FROM session_sales ss
    FULL OUTER JOIN payment_breakdown pb ON ss.pos_session_id = pb.pos_session_id;
END;
$$;

-- PASO 3: CORRECCIONES EN SALES_DOCS
-- ============================================================================

-- Agregar columna pos_session_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales_docs' 
        AND column_name = 'pos_session_id'
    ) THEN
        ALTER TABLE sales_docs 
        ADD COLUMN pos_session_id UUID REFERENCES pos_sessions(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_sales_docs_pos_session 
        ON sales_docs(pos_session_id) WHERE pos_session_id IS NOT NULL;
    END IF;
END $$;

-- Corregir columnas con nombres inconsistentes en sales_docs
ALTER TABLE sales_docs RENAME COLUMN total_ope_gravadas TO subtotal;
ALTER TABLE sales_docs RENAME COLUMN total_igv TO igv_amount;
ALTER TABLE sales_docs ADD COLUMN IF NOT EXISTS sale_date DATE GENERATED ALWAYS AS (issue_date) STORED;

-- PASO 4: CORRECCIONES EN STOCK_LEDGER
-- ============================================================================

-- Función corregida para actualizar warehouse_stock
CREATE OR REPLACE FUNCTION sync_warehouse_stock_corrected()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    -- Calcular balance actual
    SELECT COALESCE(SUM(sl.qty_in - sl.qty_out), 0)
    INTO v_balance
    FROM stock_ledger sl
    WHERE sl.warehouse_id = NEW.warehouse_id
      AND sl.product_id = NEW.product_id;
    
    -- Actualizar warehouse_stock
    INSERT INTO warehouse_stock (warehouse_id, product_id, balance_qty)
    VALUES (NEW.warehouse_id, NEW.product_id, v_balance)
    ON CONFLICT (warehouse_id, product_id) 
    DO UPDATE SET balance_qty = EXCLUDED.balance_qty;
    
    RETURN NEW;
END;
$$;

-- Reemplazar trigger existente
DROP TRIGGER IF EXISTS trigger_update_warehouse_stock ON stock_ledger;
CREATE TRIGGER trigger_update_warehouse_stock_corrected
    AFTER INSERT OR UPDATE ON stock_ledger
    FOR EACH ROW
    EXECUTE FUNCTION sync_warehouse_stock_corrected();

-- PASO 5: TABLAS ADICIONALES PARA POS
-- ============================================================================

-- Tabla para configuración de POS por almacén
CREATE TABLE IF NOT EXISTS public.pos_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Configuraciones de documentos
    default_doc_type VARCHAR(2) NOT NULL DEFAULT '03', -- Boleta por defecto
    default_series VARCHAR(4) NOT NULL DEFAULT 'B001',
    require_customer BOOLEAN DEFAULT false,
    allow_negative_stock BOOLEAN DEFAULT false,
    
    -- Configuraciones de impresión
    printer_name TEXT,
    paper_size TEXT DEFAULT 'A4',
    print_receipt BOOLEAN DEFAULT true,
    print_invoice BOOLEAN DEFAULT false,
    
    -- Configuraciones de pagos
    allowed_payment_methods JSONB DEFAULT '["CASH", "CARD"]'::JSONB,
    require_authorization_over NUMERIC(18,6) DEFAULT 1000.00,
    
    -- Configuraciones de interfaz
    theme TEXT DEFAULT 'default',
    currency_display VARCHAR(3) DEFAULT 'PEN',
    language VARCHAR(2) DEFAULT 'es',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(warehouse_id)
);

-- Trigger para pos_configurations
CREATE TRIGGER update_pos_configurations_updated_at 
    BEFORE UPDATE ON pos_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION trigger_set_timestamp();

-- Tabla para productos favoritos/recientes en POS
CREATE TABLE IF NOT EXISTS public.pos_product_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Métricas de uso
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT false,
    
    -- Configuración específica del producto para este usuario
    custom_price NUMERIC(18,6), -- Precio personalizado si aplica
    quick_qty INTEGER DEFAULT 1, -- Cantidad rápida por defecto
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, product_id, warehouse_id)
);

-- Índices para pos_product_preferences
CREATE INDEX IF NOT EXISTS idx_pos_preferences_user_warehouse ON pos_product_preferences(user_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_pos_preferences_favorites ON pos_product_preferences(user_id, warehouse_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_pos_preferences_recent ON pos_product_preferences(user_id, warehouse_id, last_used_at);

-- PASO 6: RLS PARA NUEVAS TABLAS
-- ============================================================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_session_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_product_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pos_sessions
CREATE POLICY pos_sessions_company_policy ON pos_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_companies uc 
            WHERE uc.company_id = pos_sessions.company_id 
              AND uc.user_id = auth.uid()
              AND uc.is_active = true
        )
    );

-- Políticas RLS para pos_payments
CREATE POLICY pos_payments_session_policy ON pos_payments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM pos_sessions ps
            JOIN user_companies uc ON uc.company_id = ps.company_id
            WHERE ps.id = pos_payments.pos_session_id
              AND uc.user_id = auth.uid()
              AND uc.is_active = true
        )
    );

-- Políticas RLS para pos_configurations
CREATE POLICY pos_configurations_company_policy ON pos_configurations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_companies uc 
            WHERE uc.company_id = pos_configurations.company_id 
              AND uc.user_id = auth.uid()
              AND uc.is_active = true
        )
    );

-- Políticas RLS para pos_product_preferences (solo el propio usuario)
CREATE POLICY pos_product_preferences_user_policy ON pos_product_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- PASO 7: FUNCIONES ESPECÍFICAS PARA POS
-- ============================================================================

-- Función para abrir sesión POS
CREATE OR REPLACE FUNCTION open_pos_session(
    p_company_id UUID,
    p_warehouse_id UUID,
    p_opening_amount NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Verificar que no hay sesión abierta
    IF EXISTS (
        SELECT 1 FROM pos_sessions 
        WHERE user_id = v_user_id 
          AND status = 'OPEN'
    ) THEN
        RAISE EXCEPTION 'Ya existe una sesión POS abierta para este usuario';
    END IF;
    
    -- Crear nueva sesión
    INSERT INTO pos_sessions (
        company_id, user_id, warehouse_id, 
        opening_amount, notes, status
    ) VALUES (
        p_company_id, v_user_id, p_warehouse_id,
        p_opening_amount, p_notes, 'OPEN'
    ) RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$;

-- Función para cerrar sesión POS
CREATE OR REPLACE FUNCTION close_pos_session(
    p_session_id UUID,
    p_closing_amount NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expected_amount NUMERIC;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Verificar que la sesión pertenece al usuario
    IF NOT EXISTS (
        SELECT 1 FROM pos_sessions 
        WHERE id = p_session_id 
          AND user_id = v_user_id
          AND status = 'OPEN'
    ) THEN
        RAISE EXCEPTION 'Sesión no encontrada o no pertenece al usuario';
    END IF;
    
    -- Calcular monto esperado
    SELECT opening_amount + COALESCE(
        (SELECT SUM(amount) FROM pos_payments pp 
         WHERE pp.pos_session_id = p_session_id AND pp.payment_type = 'CASH'), 0
    ) INTO v_expected_amount
    FROM pos_sessions WHERE id = p_session_id;
    
    -- Cerrar sesión
    UPDATE pos_sessions SET
        closed_at = NOW(),
        closing_amount = p_closing_amount,
        expected_amount = v_expected_amount,
        difference = p_closing_amount - v_expected_amount,
        status = 'CLOSED',
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_session_id;
    
    RETURN true;
END;
$$;

-- PASO 8: ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índices faltantes críticos
CREATE INDEX IF NOT EXISTS idx_sales_docs_customer_date ON sales_docs(customer_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_sales_doc_items_product ON sales_doc_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_docs_supplier_date ON purchase_docs(supplier_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_warehouse_date ON stock_ledger(product_id, warehouse_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_products_active_company ON products(company_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_parties_type_company ON parties(company_id, is_customer, is_supplier);

-- Índices para búsqueda de texto
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON products USING gin(sku gin_trgm_ops);

-- PASO 9: TRIGGERS ADICIONALES
-- ============================================================================

-- Trigger para actualizar pos_session_stats automáticamente
CREATE OR REPLACE FUNCTION update_pos_session_stats_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Actualizar estadísticas cuando se inserta una venta con sesión POS
    IF NEW.pos_session_id IS NOT NULL THEN
        PERFORM calculate_pos_session_stats(NEW.pos_session_id);
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_pos_stats_on_sale
    AFTER INSERT OR UPDATE ON sales_docs
    FOR EACH ROW
    WHEN (NEW.pos_session_id IS NOT NULL)
    EXECUTE FUNCTION update_pos_session_stats_trigger();

-- PASO 10: VISTAS PARA REPORTES POS
-- ============================================================================

-- Vista para resumen diario de POS
CREATE OR REPLACE VIEW v_pos_daily_summary AS
SELECT 
    ps.company_id,
    ps.warehouse_id,
    w.name as warehouse_name,
    DATE(ps.opened_at) as business_date,
    COUNT(ps.id) as total_sessions,
    COUNT(CASE WHEN ps.status = 'OPEN' THEN 1 END) as open_sessions,
    COUNT(CASE WHEN ps.status = 'CLOSED' THEN 1 END) as closed_sessions,
    SUM(ps.opening_amount) as total_opening_amount,
    SUM(ps.closing_amount) as total_closing_amount,
    SUM(ps.difference) as total_difference,
    -- Estadísticas de ventas
    COALESCE(SUM(pss.total_transactions), 0) as total_transactions,
    COALESCE(SUM(pss.total_sales_amount), 0) as total_sales,
    COALESCE(SUM(pss.total_tax_amount), 0) as total_tax
FROM pos_sessions ps
JOIN warehouses w ON w.id = ps.warehouse_id
LEFT JOIN pos_session_stats pss ON pss.session_id = ps.id
GROUP BY ps.company_id, ps.warehouse_id, w.name, DATE(ps.opened_at);

-- Vista para productos más vendidos en POS
CREATE OR REPLACE VIEW v_pos_top_products AS
SELECT 
    sd.company_id,
    sdi.product_id,
    p.sku,
    p.name as product_name,
    COUNT(sdi.id) as times_sold,
    SUM(sdi.quantity) as total_quantity,
    SUM(sdi.total_line) as total_revenue,
    AVG(sdi.unit_price) as avg_price,
    DATE_TRUNC('month', sd.issue_date) as month_year
FROM sales_doc_items sdi
JOIN sales_docs sd ON sd.id = sdi.sales_doc_id
JOIN products p ON p.id = sdi.product_id
WHERE sd.pos_session_id IS NOT NULL
  AND sd.deleted_at IS NULL
GROUP BY sd.company_id, sdi.product_id, p.sku, p.name, DATE_TRUNC('month', sd.issue_date);

-- PASO 11: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE pos_sessions IS 'Sesiones de punto de venta con control de caja';
COMMENT ON TABLE pos_payments IS 'Pagos procesados en punto de venta';
COMMENT ON TABLE pos_session_stats IS 'Estadísticas calculadas de sesiones POS';
COMMENT ON TABLE pos_configurations IS 'Configuraciones de POS por almacén';
COMMENT ON TABLE pos_product_preferences IS 'Preferencias de productos por usuario en POS';

COMMENT ON FUNCTION open_pos_session IS 'Abre una nueva sesión POS para el usuario actual';
COMMENT ON FUNCTION close_pos_session IS 'Cierra una sesión POS con conteo de caja';
COMMENT ON FUNCTION calculate_pos_session_stats IS 'Calcula estadísticas de una sesión POS';
COMMENT ON FUNCTION get_pos_session_stats IS 'Obtiene estadísticas actuales de una sesión POS';

-- GRANTS
GRANT EXECUTE ON FUNCTION open_pos_session TO authenticated;
GRANT EXECUTE ON FUNCTION close_pos_session TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_pos_session_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_session_stats TO authenticated;

-- ============================================================================
-- FIN DE LA MIGRACIÓN CORRECTIVA
-- ============================================================================