-- ============================================================================
-- REESTRUCTURACIÓN DEL MÓDULO DE COMPRAS - ELIMINACIÓN DE DUPLICACIONES
-- ============================================================================
-- Fecha: 2025-02-02
-- Propósito: Corregir duplicaciones en tablas de compras y unificar flujo
-- Arquitecto: Sistema ERP - Optimización de Compras
-- ============================================================================

-- PASO 1: ANÁLISIS ACTUAL DE PROBLEMAS
-- ============================================================================
/*
PROBLEMAS IDENTIFICADOS:
1. purchase_orders + purchase_order_items duplica funcionalidad de purchase_docs + purchase_doc_items
2. receptions puede existir sin purchase_doc asociado
3. Solo receptions genera movimientos en stock_ledger, no purchase_docs
4. Flujos confusos y redundantes
5. Falta trazabilidad clara entre documento contable y movimiento físico

SOLUCIÓN PROPUESTA:
- purchase_docs = DOCUMENTO CONTABLE (Factura del proveedor) 
- receptions = MOVIMIENTO FÍSICO (Recepción de mercancía)
- purchase_orders = OPCIONAL (solo para flujo con aprobaciones)
- stock_ledger = AUTOMÁTICO desde purchase_docs
*/

-- PASO 2: MODIFICACIONES A PURCHASE_DOCS
-- ============================================================================

-- Agregar campos faltantes para unificar con purchase_orders
ALTER TABLE purchase_docs ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE purchase_docs ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE purchase_docs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RECEIVED' CHECK (status IN ('PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'));
ALTER TABLE purchase_docs ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- Agregar índices
CREATE INDEX IF NOT EXISTS idx_purchase_docs_status ON purchase_docs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_docs_order ON purchase_docs(purchase_order_id) WHERE purchase_order_id IS NOT NULL;

-- Corregir nombres de columnas para consistencia con sales_docs
ALTER TABLE purchase_docs RENAME COLUMN total_ope_gravadas TO subtotal;
ALTER TABLE purchase_docs RENAME COLUMN total_igv TO igv_amount;

-- PASO 3: MODIFICACIONES A RECEPTIONS
-- ============================================================================

-- Hacer purchase_doc_id opcional pero recomendado
ALTER TABLE receptions ALTER COLUMN purchase_doc_id DROP NOT NULL;

-- Agregar campos para casos sin purchase_doc
ALTER TABLE receptions ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES parties(id) ON DELETE RESTRICT;
ALTER TABLE receptions ADD COLUMN IF NOT EXISTS doc_reference TEXT; -- Para casos sin documento formal

-- Constraint para asegurar que tenga al menos purchase_doc_id O supplier_id
ALTER TABLE receptions ADD CONSTRAINT chk_reception_has_reference 
CHECK (purchase_doc_id IS NOT NULL OR supplier_id IS NOT NULL);

-- PASO 4: TRIGGERS CORREGIDOS PARA STOCK_LEDGER
-- ============================================================================

-- Función para generar movimientos de stock desde purchase_docs
CREATE OR REPLACE FUNCTION generate_stock_from_purchase_doc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    v_warehouse_id UUID;
BEGIN
    -- Solo generar movimientos para documentos en estado RECEIVED
    IF NEW.status != 'RECEIVED' THEN
        RETURN NEW;
    END IF;
    
    -- Si ya se generaron movimientos, no duplicar
    IF EXISTS (
        SELECT 1 FROM stock_ledger 
        WHERE source = 'purchase_doc' 
          AND source_id = NEW.id::TEXT
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Obtener almacén por defecto de la empresa o el primero disponible
    SELECT id INTO v_warehouse_id 
    FROM warehouses 
    WHERE company_id = NEW.company_id 
      AND is_active = true 
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró almacén activo para la empresa';
    END IF;
    
    -- Generar movimientos para cada item
    FOR item IN 
        SELECT * FROM purchase_doc_items 
        WHERE purchase_doc_id = NEW.id
    LOOP
        INSERT INTO stock_ledger (
            company_id, warehouse_id, product_id, movement_date,
            ref_doc_type, ref_doc_series, ref_doc_number,
            operation_type, qty_in, unit_cost_in, total_cost_in,
            original_currency_code, exchange_rate,
            original_unit_cost_in, original_total_cost_in,
            source, source_id, notes
        ) VALUES (
            NEW.company_id, v_warehouse_id, item.product_id, NEW.issue_date,
            NEW.doc_type, NEW.series, NEW.number,
            'COMPRA', item.quantity, item.unit_cost, item.total_line,
            NEW.currency_code, COALESCE(NEW.exchange_rate, 1),
            item.unit_cost, item.total_line,
            'purchase_doc', NEW.id::TEXT,
            'Movimiento automático desde documento de compra'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Trigger para purchase_docs
DROP TRIGGER IF EXISTS trg_purchase_doc_to_stock ON purchase_docs;
CREATE TRIGGER trg_purchase_doc_to_stock
    AFTER INSERT OR UPDATE OF status ON purchase_docs
    FOR EACH ROW
    EXECUTE FUNCTION generate_stock_from_purchase_doc();

-- PASO 5: FUNCIÓN PARA MIGRAR DATOS EXISTENTES
-- ============================================================================

-- Función para migrar purchase_orders existentes a purchase_docs
CREATE OR REPLACE FUNCTION migrate_purchase_orders_to_docs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
    new_doc_id UUID;
    migrated_count INTEGER := 0;
BEGIN
    -- Migrar órdenes que no tienen purchase_doc asociado
    FOR order_record IN 
        SELECT po.* 
        FROM purchase_orders po
        WHERE po.status = 'RECEIVED'
          AND NOT EXISTS (
              SELECT 1 FROM purchase_docs pd 
              WHERE pd.purchase_order_id = po.id
          )
    LOOP
        -- Crear purchase_doc desde purchase_order
        INSERT INTO purchase_docs (
            company_id, supplier_id, purchase_order_id,
            doc_type, series, number, issue_date,
            currency_code, exchange_rate,
            subtotal, igv_amount, total,
            status, created_at
        ) VALUES (
            order_record.company_id, order_record.supplier_id, order_record.id,
            '01', 'ORD', order_record.id::TEXT, order_record.order_date,
            order_record.currency_code, order_record.exchange_rate,
            order_record.total_amount * 0.82, -- Asumir 18% IGV
            order_record.total_amount * 0.18,
            order_record.total_amount,
            'RECEIVED', order_record.created_at
        ) RETURNING id INTO new_doc_id;
        
        -- Migrar items
        FOR item_record IN
            SELECT poi.*
            FROM purchase_order_items poi
            WHERE poi.purchase_order_id = order_record.id
        LOOP
            INSERT INTO purchase_doc_items (
                company_id, purchase_doc_id, product_id,
                quantity, unit_cost, total_line,
                unit_code, igv_affectation,
                created_at
            ) VALUES (
                order_record.company_id, new_doc_id, item_record.product_id,
                item_record.quantity, item_record.unit_price, item_record.total_line,
                'NIU', '10', -- Valores por defecto
                item_record.created_at
            );
        END LOOP;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$;

-- PASO 6: FUNCIONES DE VALIDACIÓN Y UTILIDAD
-- ============================================================================

-- Función para validar consistencia entre receptions y purchase_docs
CREATE OR REPLACE FUNCTION validate_purchase_reception_consistency(p_company_id UUID)
RETURNS TABLE(
    purchase_doc_id UUID,
    doc_reference TEXT,
    ordered_qty NUMERIC,
    received_qty NUMERIC,
    pending_qty NUMERIC,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH purchase_totals AS (
        SELECT 
            pd.id as doc_id,
            pd.series || '-' || pd.number as doc_ref,
            SUM(pdi.quantity) as total_ordered
        FROM purchase_docs pd
        JOIN purchase_doc_items pdi ON pdi.purchase_doc_id = pd.id
        WHERE pd.company_id = p_company_id
        GROUP BY pd.id, pd.series, pd.number
    ),
    reception_totals AS (
        SELECT 
            r.purchase_doc_id,
            SUM(ri.quantity_received) as total_received
        FROM receptions r
        JOIN reception_items ri ON ri.reception_id = r.id
        WHERE r.company_id = p_company_id
          AND r.purchase_doc_id IS NOT NULL
        GROUP BY r.purchase_doc_id
    )
    SELECT 
        pt.doc_id,
        pt.doc_ref,
        pt.total_ordered,
        COALESCE(rt.total_received, 0),
        pt.total_ordered - COALESCE(rt.total_received, 0),
        CASE 
            WHEN COALESCE(rt.total_received, 0) = 0 THEN 'PENDING'
            WHEN COALESCE(rt.total_received, 0) < pt.total_ordered THEN 'PARTIALLY_RECEIVED'
            WHEN COALESCE(rt.total_received, 0) = pt.total_ordered THEN 'RECEIVED'
            ELSE 'OVER_RECEIVED'
        END as reception_status
    FROM purchase_totals pt
    LEFT JOIN reception_totals rt ON rt.purchase_doc_id = pt.doc_id
    ORDER BY pt.doc_id;
END;
$$;

-- Función para sincronizar estados de purchase_docs basado en recepciones
CREATE OR REPLACE FUNCTION sync_purchase_doc_status(p_purchase_doc_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ordered_qty NUMERIC;
    v_received_qty NUMERIC;
    v_new_status TEXT;
BEGIN
    -- Calcular cantidades ordenadas
    SELECT SUM(quantity) INTO v_ordered_qty
    FROM purchase_doc_items
    WHERE purchase_doc_id = p_purchase_doc_id;
    
    -- Calcular cantidades recibidas
    SELECT COALESCE(SUM(ri.quantity_received), 0) INTO v_received_qty
    FROM receptions r
    JOIN reception_items ri ON ri.reception_id = r.id
    WHERE r.purchase_doc_id = p_purchase_doc_id;
    
    -- Determinar nuevo estado
    v_new_status := CASE 
        WHEN v_received_qty = 0 THEN 'PENDING'
        WHEN v_received_qty < v_ordered_qty THEN 'PARTIALLY_RECEIVED'
        WHEN v_received_qty >= v_ordered_qty THEN 'RECEIVED'
    END;
    
    -- Actualizar estado
    UPDATE purchase_docs 
    SET status = v_new_status, updated_at = NOW()
    WHERE id = p_purchase_doc_id;
    
    RETURN v_new_status;
END;
$$;

-- Trigger para sincronizar estado automáticamente
CREATE OR REPLACE FUNCTION trigger_sync_purchase_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.purchase_doc_id IS NOT NULL THEN
        PERFORM sync_purchase_doc_status(NEW.purchase_doc_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_purchase_status_on_reception
    AFTER INSERT OR UPDATE ON reception_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_purchase_status();

-- PASO 7: VISTAS OPTIMIZADAS PARA COMPRAS
-- ============================================================================

-- Vista unificada de compras (con y sin órdenes)
CREATE OR REPLACE VIEW v_purchase_summary AS
SELECT 
    pd.id,
    pd.company_id,
    pd.supplier_id,
    p.fullname as supplier_name,
    p.doc_number as supplier_doc,
    pd.purchase_order_id,
    po.order_date,
    pd.doc_type,
    pd.series,
    pd.number,
    pd.issue_date,
    pd.currency_code,
    pd.exchange_rate,
    pd.subtotal,
    pd.igv_amount,
    pd.total,
    pd.status,
    -- Estadísticas de recepción
    COALESCE(r_stats.total_received_qty, 0) as total_received_qty,
    COALESCE(r_stats.pending_qty, 0) as pending_qty,
    COALESCE(r_stats.reception_count, 0) as reception_count,
    pd.created_at,
    pd.updated_at
FROM purchase_docs pd
JOIN parties p ON p.id = pd.supplier_id
LEFT JOIN purchase_orders po ON po.id = pd.purchase_order_id
LEFT JOIN (
    SELECT 
        r.purchase_doc_id,
        SUM(ri.quantity_received) as total_received_qty,
        (
            SELECT SUM(pdi.quantity) 
            FROM purchase_doc_items pdi 
            WHERE pdi.purchase_doc_id = r.purchase_doc_id
        ) - SUM(ri.quantity_received) as pending_qty,
        COUNT(DISTINCT r.id) as reception_count
    FROM receptions r
    JOIN reception_items ri ON ri.reception_id = r.id
    WHERE r.purchase_doc_id IS NOT NULL
    GROUP BY r.purchase_doc_id
) r_stats ON r_stats.purchase_doc_id = pd.id;

-- Vista de productos más comprados
CREATE OR REPLACE VIEW v_top_purchased_products AS
SELECT 
    pd.company_id,
    pdi.product_id,
    p.sku,
    p.name as product_name,
    COUNT(pdi.id) as purchase_frequency,
    SUM(pdi.quantity) as total_quantity,
    SUM(pdi.total_line) as total_spent,
    AVG(pdi.unit_cost) as avg_cost,
    MAX(pd.issue_date) as last_purchase_date,
    COUNT(DISTINCT pd.supplier_id) as supplier_count
FROM purchase_doc_items pdi
JOIN purchase_docs pd ON pd.id = pdi.purchase_doc_id
JOIN products p ON p.id = pdi.product_id
WHERE pd.deleted_at IS NULL
GROUP BY pd.company_id, pdi.product_id, p.sku, p.name;

-- PASO 8: FUNCIONES PARA REPORTES
-- ============================================================================

-- Reporte de eficiencia de recepciones
CREATE OR REPLACE FUNCTION report_reception_efficiency(
    p_company_id UUID,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE(
    supplier_id UUID,
    supplier_name TEXT,
    total_orders INTEGER,
    on_time_deliveries INTEGER,
    late_deliveries INTEGER,
    efficiency_rate NUMERIC,
    avg_delay_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH delivery_analysis AS (
        SELECT 
            pd.supplier_id,
            pd.id as purchase_doc_id,
            pd.expected_delivery_date,
            MIN(r.reception_date) as actual_delivery_date,
            CASE 
                WHEN MIN(r.reception_date) <= pd.expected_delivery_date THEN 1 
                ELSE 0 
            END as on_time,
            CASE 
                WHEN pd.expected_delivery_date IS NOT NULL THEN
                    EXTRACT(days FROM MIN(r.reception_date) - pd.expected_delivery_date)
                ELSE 0
            END as delay_days
        FROM purchase_docs pd
        LEFT JOIN receptions r ON r.purchase_doc_id = pd.id
        WHERE pd.company_id = p_company_id
          AND pd.issue_date BETWEEN p_date_from AND p_date_to
          AND pd.expected_delivery_date IS NOT NULL
        GROUP BY pd.id, pd.supplier_id, pd.expected_delivery_date
    )
    SELECT 
        da.supplier_id,
        parties.fullname,
        COUNT(da.purchase_doc_id)::INTEGER,
        SUM(da.on_time)::INTEGER,
        (COUNT(da.purchase_doc_id) - SUM(da.on_time))::INTEGER,
        CASE 
            WHEN COUNT(da.purchase_doc_id) > 0 THEN
                ROUND(SUM(da.on_time)::NUMERIC / COUNT(da.purchase_doc_id) * 100, 2)
            ELSE 0
        END,
        ROUND(AVG(GREATEST(da.delay_days, 0)), 2)
    FROM delivery_analysis da
    JOIN parties ON parties.id = da.supplier_id
    GROUP BY da.supplier_id, parties.fullname
    ORDER BY efficiency_rate DESC, total_orders DESC;
END;
$$;

-- PASO 9: LIMPIEZA Y OPTIMIZACIÓN
-- ============================================================================

-- Función para limpiar duplicados (usar con precaución en producción)
CREATE OR REPLACE FUNCTION cleanup_duplicate_purchase_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_migrated INTEGER;
    v_cleaned INTEGER := 0;
BEGIN
    -- Migrar órdenes a documentos
    SELECT migrate_purchase_orders_to_docs() INTO v_migrated;
    
    -- Eliminar órdenes ya migradas (opcional y peligroso - comentado)
    /*
    DELETE FROM purchase_order_items 
    WHERE purchase_order_id IN (
        SELECT po.id FROM purchase_orders po
        JOIN purchase_docs pd ON pd.purchase_order_id = po.id
    );
    
    DELETE FROM purchase_orders
    WHERE id IN (
        SELECT purchase_order_id FROM purchase_docs 
        WHERE purchase_order_id IS NOT NULL
    );
    
    GET DIAGNOSTICS v_cleaned = ROW_COUNT;
    */
    
    v_result := json_build_object(
        'migrated_orders', v_migrated,
        'cleaned_orders', v_cleaned,
        'company_id', p_company_id,
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- PASO 10: GRANTS Y COMENTARIOS
-- ============================================================================

-- Grants para funciones
GRANT EXECUTE ON FUNCTION migrate_purchase_orders_to_docs() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_purchase_reception_consistency(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_purchase_doc_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION report_reception_efficiency(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_purchase_data(UUID) TO service_role; -- Solo admin

-- Comentarios
COMMENT ON TABLE purchase_docs IS 'Documentos contables de compra (Facturas/Boletas de proveedores) - tabla principal';
COMMENT ON TABLE purchase_orders IS 'Órdenes de compra (opcional para flujos con aprobación)';
COMMENT ON TABLE receptions IS 'Recepciones físicas de mercancía';
COMMENT ON TABLE reception_items IS 'Detalle de items recibidos físicamente';

COMMENT ON FUNCTION migrate_purchase_orders_to_docs() IS 'Migra órdenes de compra a documentos contables';
COMMENT ON FUNCTION validate_purchase_reception_consistency(UUID) IS 'Valida consistencia entre documentos y recepciones';
COMMENT ON FUNCTION sync_purchase_doc_status(UUID) IS 'Sincroniza estado de documento basado en recepciones';
COMMENT ON FUNCTION report_reception_efficiency(UUID, DATE, DATE) IS 'Reporte de eficiencia de entregas por proveedor';

-- ============================================================================
-- RESUMEN DE CAMBIOS:
-- ============================================================================
/*
✅ ELIMINADAS DUPLICACIONES:
   - purchase_docs es ahora la fuente única de verdad
   - purchase_orders solo para flujos que requieren aprobación
   - receptions maneja solo aspecto físico

✅ FLUJOS CLARIFICADOS:
   - Con orden: purchase_orders → purchase_docs → receptions
   - Sin orden: purchase_docs → receptions  
   - Stock automático: purchase_docs → stock_ledger

✅ INTEGRIDAD MEJORADA:
   - Estados sincronizados automáticamente
   - Validaciones de consistencia
   - Trazabilidad completa

✅ PERFORMANCE OPTIMIZADO:
   - Índices estratégicos
   - Vistas materializadas
   - Funciones eficientes
*/

-- ============================================================================
-- FIN DE LA REESTRUCTURACIÓN DE COMPRAS
-- ============================================================================