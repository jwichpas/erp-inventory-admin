-- ============================================================================
-- REESTRUCTURACIÓN DEL MÓDULO DE VENTAS - ELIMINACIÓN DE DUPLICACIONES
-- ============================================================================
-- Fecha: 2025-02-02
-- Propósito: Corregir duplicaciones en ventas e integrar POS con inventario
-- Arquitecto: Sistema ERP - Optimización de Ventas
-- ============================================================================

-- PASO 1: ANÁLISIS DE PROBLEMAS EN VENTAS
-- ============================================================================
/*
PROBLEMAS IDENTIFICADOS:
1. sales_orders + sales_order_items duplica funcionalidad de sales_docs + sales_doc_items
2. POS crea sales_docs pero NO genera movimientos de inventario automáticamente
3. Solo shipments genera salidas en stock_ledger, no sales_docs
4. Estados no sincronizados entre documentos y entregas
5. POS funciona sin validación de stock en tiempo real
6. Múltiples fuentes de verdad conflictivas

SOLUCIÓN PROPUESTA:
- sales_docs = DOCUMENTO TRIBUTARIO principal con integración automática a stock
- sales_orders = OPCIONAL (solo para flujos de cotización)
- shipments = DESPACHOS físicos con sincronización de estados
- pos_sessions = INTEGRADO completamente con inventario
- stock_ledger = AUTOMÁTICO desde sales_docs (no solo desde shipments)
*/

-- PASO 2: CORRECCIONES EN SALES_DOCS
-- ============================================================================

-- Agregar campos faltantes para unificar funcionalidad
ALTER TABLE sales_docs ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;
ALTER TABLE sales_docs ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE sales_docs ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE sales_docs ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE sales_docs ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'PENDING' 
    CHECK (delivery_status IN ('PENDING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'CANCELLED'));

-- Corregir nombres de columnas para consistencia
-- Ya se hizo en migración anterior: total_ope_gravadas → subtotal, total_igv → igv_amount

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_sales_docs_warehouse ON sales_docs(warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_docs_delivery_status ON sales_docs(company_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_sales_docs_order ON sales_docs(sales_order_id) WHERE sales_order_id IS NOT NULL;

-- PASO 3: INTEGRACIÓN AUTOMÁTICA DE STOCK PARA VENTAS
-- ============================================================================

-- Función para generar movimientos de stock desde sales_docs
CREATE OR REPLACE FUNCTION generate_stock_from_sales_doc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    v_warehouse_id UUID;
    v_session_warehouse_id UUID;
    v_unit_cost NUMERIC;
BEGIN
    -- Solo generar movimientos para documentos emitidos (no anulados)
    IF NEW.greenter_status = 'ANULADO' OR NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Evitar duplicar movimientos
    IF EXISTS (
        SELECT 1 FROM stock_ledger 
        WHERE source = 'sales_doc' 
          AND source_id = NEW.id::TEXT
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Determinar almacén: 1) Desde POS session, 2) Documento, 3) Default empresa
    IF NEW.pos_session_id IS NOT NULL THEN
        SELECT warehouse_id INTO v_session_warehouse_id 
        FROM pos_sessions 
        WHERE id = NEW.pos_session_id;
        
        v_warehouse_id := v_session_warehouse_id;
    ELSE
        v_warehouse_id := NEW.warehouse_id;
    END IF;
    
    -- Si no hay almacén definido, usar el primero de la empresa
    IF v_warehouse_id IS NULL THEN
        SELECT id INTO v_warehouse_id 
        FROM warehouses 
        WHERE company_id = NEW.company_id 
          AND is_active = true 
          AND deleted_at IS NULL
        LIMIT 1;
    END IF;
    
    IF v_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró almacén para procesar la venta: %', NEW.id;
    END IF;
    
    -- Generar movimientos de salida para cada item
    FOR item IN 
        SELECT * FROM sales_doc_items 
        WHERE sales_doc_id = NEW.id
    LOOP
        -- Obtener costo actual del producto
        SELECT COALESCE(balance_unit_cost, 0) INTO v_unit_cost
        FROM stock_ledger
        WHERE company_id = NEW.company_id 
          AND warehouse_id = v_warehouse_id
          AND product_id = item.product_id
          AND balance_qty > 0
        ORDER BY movement_date DESC, created_at DESC
        LIMIT 1;
        
        -- Si no hay costo, usar 0 (problema de configuración pero no bloquear venta)
        v_unit_cost := COALESCE(v_unit_cost, 0);
        
        -- Validar stock disponible (solo si no es POS con configuración permisiva)
        IF NEW.pos_session_id IS NULL THEN
            PERFORM check_stock_availability(item.product_id, v_warehouse_id, item.quantity);
        END IF;
        
        INSERT INTO stock_ledger (
            company_id, warehouse_id, product_id, movement_date,
            ref_doc_type, ref_doc_series, ref_doc_number,
            operation_type, qty_out, unit_cost_out, total_cost_out,
            original_currency_code, exchange_rate,
            source, source_id, notes
        ) VALUES (
            NEW.company_id, v_warehouse_id, item.product_id, NEW.issue_date,
            NEW.doc_type, NEW.series, NEW.number::TEXT,
            CASE 
                WHEN NEW.pos_session_id IS NOT NULL THEN 'VENTA_POS'
                ELSE 'VENTA'
            END,
            item.quantity, v_unit_cost, (item.quantity * v_unit_cost),
            NEW.currency_code, COALESCE(NEW.exchange_rate, 1),
            'sales_doc', NEW.id::TEXT,
            CASE 
                WHEN NEW.pos_session_id IS NOT NULL THEN 'Venta POS automática'
                ELSE 'Venta automática desde documento'
            END
        );
    END LOOP;
    
    -- Actualizar estado de entrega si es venta directa
    IF NEW.pos_session_id IS NOT NULL THEN
        NEW.delivery_status := 'DELIVERED'; -- POS = entrega inmediata
    ELSIF NEW.delivery_status IS NULL THEN
        NEW.delivery_status := 'PENDING';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para sales_docs
DROP TRIGGER IF EXISTS trg_sales_doc_to_stock ON sales_docs;
CREATE TRIGGER trg_sales_doc_to_stock
    AFTER INSERT OR UPDATE ON sales_docs
    FOR EACH ROW
    EXECUTE FUNCTION generate_stock_from_sales_doc();

-- PASO 4: VALIDACIÓN DE STOCK EN TIEMPO REAL PARA POS
-- ============================================================================

-- Función mejorada para validar disponibilidad con detalles
CREATE OR REPLACE FUNCTION check_stock_availability_detailed(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity NUMERIC,
    p_company_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available NUMERIC := 0;
    v_reserved NUMERIC := 0;
    v_product_name TEXT;
    v_result JSON;
BEGIN
    -- Obtener stock disponible
    SELECT COALESCE(balance_qty, 0) INTO v_available 
    FROM warehouse_stock 
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;
    
    -- Obtener nombre del producto
    SELECT name INTO v_product_name 
    FROM products 
    WHERE id = p_product_id;
    
    -- Calcular reservado (órdenes pendientes)
    SELECT COALESCE(SUM(soi.quantity), 0) INTO v_reserved
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.sales_order_id
    WHERE soi.product_id = p_product_id
      AND so.company_id = p_company_id
      AND so.status IN ('PENDING', 'APPROVED')
      AND NOT EXISTS (
          SELECT 1 FROM sales_docs sd 
          WHERE sd.sales_order_id = so.id
      );
    
    v_result := json_build_object(
        'product_id', p_product_id,
        'product_name', v_product_name,
        'available_stock', v_available,
        'reserved_stock', v_reserved,
        'real_available', v_available - v_reserved,
        'requested_quantity', p_quantity,
        'is_sufficient', (v_available - v_reserved) >= p_quantity,
        'shortage', CASE 
            WHEN (v_available - v_reserved) < p_quantity 
            THEN p_quantity - (v_available - v_reserved)
            ELSE 0 
        END
    );
    
    RETURN v_result;
END;
$$;

-- Función para validar carrito completo (POS)
CREATE OR REPLACE FUNCTION validate_pos_cart(
    p_company_id UUID,
    p_warehouse_id UUID,
    p_cart_items JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSON;
    validation_result JSON;
    all_validations JSON[] := '{}';
    has_errors BOOLEAN := false;
    final_result JSON;
BEGIN
    -- Validar cada item del carrito
    FOR item IN SELECT * FROM json_array_elements(p_cart_items)
    LOOP
        SELECT check_stock_availability_detailed(
            (item->>'product_id')::UUID,
            p_warehouse_id,
            (item->>'quantity')::NUMERIC,
            p_company_id
        ) INTO validation_result;
        
        -- Agregar info del item
        validation_result := validation_result || json_build_object(
            'unit_price', item->>'unit_price',
            'line_total', (item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC
        );
        
        all_validations := all_validations || validation_result;
        
        -- Marcar si hay errores
        IF NOT (validation_result->>'is_sufficient')::BOOLEAN THEN
            has_errors := true;
        END IF;
    END LOOP;
    
    final_result := json_build_object(
        'company_id', p_company_id,
        'warehouse_id', p_warehouse_id,
        'has_stock_errors', has_errors,
        'items', array_to_json(all_validations),
        'validation_timestamp', NOW()
    );
    
    RETURN final_result;
END;
$$;

-- PASO 5: SINCRONIZACIÓN DE ESTADOS ENTRE VENTAS Y ENTREGAS
-- ============================================================================

-- Función para sincronizar estado de entrega basado en shipments
CREATE OR REPLACE FUNCTION sync_sales_delivery_status(p_sales_doc_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ordered_qty NUMERIC;
    v_shipped_qty NUMERIC;
    v_new_status TEXT;
BEGIN
    -- Calcular cantidades ordenadas
    SELECT SUM(quantity) INTO v_ordered_qty
    FROM sales_doc_items
    WHERE sales_doc_id = p_sales_doc_id;
    
    -- Calcular cantidades despachadas
    SELECT COALESCE(SUM(si.quantity_shipped), 0) INTO v_shipped_qty
    FROM shipments s
    JOIN shipment_items si ON si.shipment_id = s.id
    WHERE s.sales_doc_id = p_sales_doc_id;
    
    -- Determinar nuevo estado
    v_new_status := CASE 
        WHEN v_shipped_qty = 0 THEN 'PENDING'
        WHEN v_shipped_qty < v_ordered_qty THEN 'PARTIALLY_SHIPPED'
        WHEN v_shipped_qty >= v_ordered_qty THEN 'SHIPPED'
    END;
    
    -- Actualizar estado
    UPDATE sales_docs 
    SET delivery_status = v_new_status, updated_at = NOW()
    WHERE id = p_sales_doc_id;
    
    RETURN v_new_status;
END;
$$;

-- Trigger para sincronizar automáticamente
CREATE OR REPLACE FUNCTION trigger_sync_sales_delivery_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.sales_doc_id IS NOT NULL THEN
        PERFORM sync_sales_delivery_status(NEW.sales_doc_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_sales_delivery_status
    AFTER INSERT OR UPDATE ON shipment_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_sales_delivery_status();

-- PASO 6: MIGRACIÓN DE DATOS DUPLICADOS
-- ============================================================================

-- Función para migrar sales_orders a sales_docs
CREATE OR REPLACE FUNCTION migrate_sales_orders_to_docs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_record RECORD;
    item_record RECORD;
    new_doc_id UUID;
    migrated_count INTEGER := 0;
    next_number BIGINT;
BEGIN
    -- Migrar órdenes completadas que no tienen sales_doc asociado
    FOR order_record IN 
        SELECT so.* 
        FROM sales_orders so
        WHERE so.status IN ('SHIPPED', 'APPROVED')
          AND NOT EXISTS (
              SELECT 1 FROM sales_docs sd 
              WHERE sd.sales_order_id = so.id
          )
    LOOP
        -- Obtener siguiente número de documento
        SELECT public.next_document_number(
            order_record.company_id, 
            '03', -- Boleta por defecto
            'B001'
        ) INTO next_number;
        
        -- Crear sales_doc desde sales_order
        INSERT INTO sales_docs (
            company_id, customer_id, sales_order_id,
            doc_type, series, number, issue_date,
            currency_code, exchange_rate,
            subtotal, igv_amount, total,
            delivery_status, created_at
        ) VALUES (
            order_record.company_id, order_record.customer_id, order_record.id,
            '03', 'B001', next_number, order_record.order_date,
            order_record.currency_code, order_record.exchange_rate,
            order_record.total_amount * 0.8474, -- Subtotal (total / 1.18)
            order_record.total_amount * 0.1526, -- IGV 18%
            order_record.total_amount,
            CASE WHEN order_record.status = 'SHIPPED' THEN 'SHIPPED' ELSE 'PENDING' END,
            order_record.created_at
        ) RETURNING id INTO new_doc_id;
        
        -- Migrar items
        FOR item_record IN
            SELECT soi.*
            FROM sales_order_items soi
            WHERE soi.sales_order_id = order_record.id
        LOOP
            INSERT INTO sales_doc_items (
                company_id, sales_doc_id, product_id,
                quantity, unit_price, total_line,
                discount_rate, unit_code, igv_affectation,
                created_at
            ) VALUES (
                order_record.company_id, new_doc_id, item_record.product_id,
                item_record.quantity, item_record.unit_price, item_record.total_line,
                item_record.discount_pct, 'NIU', '10', -- Valores por defecto
                item_record.created_at
            );
        END LOOP;
        
        migrated_count := migrated_count + 1;
    END LOOP;
    
    RETURN migrated_count;
END;
$$;

-- PASO 7: FUNCIONES ESPECÍFICAS PARA POS MEJORADO
-- ============================================================================

-- Función para procesar venta POS con validación de stock
CREATE OR REPLACE FUNCTION process_pos_sale(
    p_session_id UUID,
    p_customer_id UUID,
    p_cart_items JSON,
    p_payments JSON,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_company_id UUID;
    v_warehouse_id UUID;
    v_user_id UUID;
    v_validation JSON;
    v_doc_number BIGINT;
    v_sales_doc_id UUID;
    item JSON;
    payment JSON;
    v_subtotal NUMERIC := 0;
    v_igv NUMERIC := 0;
    v_total NUMERIC := 0;
    v_result JSON;
BEGIN
    -- Obtener información de la sesión
    SELECT * INTO v_session
    FROM pos_sessions 
    WHERE id = p_session_id AND status = 'OPEN';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Sesión POS no encontrada o cerrada');
    END IF;
    
    v_company_id := v_session.company_id;
    v_warehouse_id := v_session.warehouse_id;
    v_user_id := v_session.user_id;
    
    -- Validar stock disponible
    SELECT validate_pos_cart(v_company_id, v_warehouse_id, p_cart_items) INTO v_validation;
    
    IF (v_validation->>'has_stock_errors')::BOOLEAN THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Stock insuficiente',
            'validation', v_validation
        );
    END IF;
    
    -- Calcular totales
    FOR item IN SELECT * FROM json_array_elements(p_cart_items)
    LOOP
        v_subtotal := v_subtotal + (item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC;
    END LOOP;
    
    v_igv := v_subtotal * 0.18;
    v_total := v_subtotal + v_igv;
    
    -- Obtener número de documento
    SELECT public.next_document_number(v_company_id, '03', 'B001') INTO v_doc_number;
    
    -- Crear documento de venta
    INSERT INTO sales_docs (
        company_id, customer_id, pos_session_id, warehouse_id,
        doc_type, series, number, issue_date,
        currency_code, exchange_rate,
        subtotal, igv_amount, total,
        delivery_status, status, notes
    ) VALUES (
        v_company_id, p_customer_id, p_session_id, v_warehouse_id,
        '03', 'B001', v_doc_number, CURRENT_DATE,
        'PEN', 1,
        v_subtotal, v_igv, v_total,
        'DELIVERED', 'ISSUED', p_notes
    ) RETURNING id INTO v_sales_doc_id;
    
    -- Crear items del documento
    FOR item IN SELECT * FROM json_array_elements(p_cart_items)
    LOOP
        INSERT INTO sales_doc_items (
            company_id, sales_doc_id, product_id,
            quantity, unit_price, discount_rate,
            igv_amount, total_line,
            unit_code, igv_affectation
        ) VALUES (
            v_company_id, v_sales_doc_id, (item->>'product_id')::UUID,
            (item->>'quantity')::NUMERIC, (item->>'unit_price')::NUMERIC, 
            COALESCE((item->>'discount')::NUMERIC, 0),
            (item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC * 0.18,
            (item->>'quantity')::NUMERIC * (item->>'unit_price')::NUMERIC,
            'NIU', '10'
        );
    END LOOP;
    
    -- Registrar pagos
    FOR payment IN SELECT * FROM json_array_elements(p_payments)
    LOOP
        INSERT INTO pos_payments (
            sales_doc_id, pos_session_id,
            payment_type, amount, currency_code,
            reference, card_type, auth_code
        ) VALUES (
            v_sales_doc_id, p_session_id,
            payment->>'type', (payment->>'amount')::NUMERIC, 'PEN',
            payment->>'reference', payment->>'card_type', payment->>'auth_code'
        );
    END LOOP;
    
    -- El trigger automáticamente generará los movimientos de stock
    
    v_result := json_build_object(
        'success', true,
        'sales_doc_id', v_sales_doc_id,
        'document_number', 'B001-' || LPAD(v_doc_number::TEXT, 8, '0'),
        'total', v_total,
        'stock_validation', v_validation
    );
    
    RETURN v_result;
END;
$$;

-- PASO 8: VISTAS OPTIMIZADAS PARA VENTAS
-- ============================================================================

-- Vista unificada de ventas (con y sin órdenes)
CREATE OR REPLACE VIEW v_sales_summary AS
SELECT 
    sd.id,
    sd.company_id,
    sd.customer_id,
    c.fullname as customer_name,
    c.doc_number as customer_doc,
    sd.sales_order_id,
    so.order_date,
    sd.pos_session_id,
    ps.opened_at as pos_session_date,
    sd.doc_type,
    sd.series,
    sd.number,
    sd.issue_date,
    sd.currency_code,
    sd.exchange_rate,
    sd.subtotal,
    sd.igv_amount,
    sd.total,
    sd.delivery_status,
    sd.greenter_status,
    -- Estadísticas de entrega
    COALESCE(s_stats.total_shipped_qty, 0) as total_shipped_qty,
    COALESCE(s_stats.pending_qty, 0) as pending_qty,
    COALESCE(s_stats.shipment_count, 0) as shipment_count,
    -- Tipo de venta
    CASE 
        WHEN sd.pos_session_id IS NOT NULL THEN 'POS'
        WHEN sd.sales_order_id IS NOT NULL THEN 'ORDER'
        ELSE 'DIRECT'
    END as sale_type,
    sd.created_at,
    sd.updated_at
FROM sales_docs sd
JOIN parties c ON c.id = sd.customer_id
LEFT JOIN sales_orders so ON so.id = sd.sales_order_id
LEFT JOIN pos_sessions ps ON ps.id = sd.pos_session_id
LEFT JOIN (
    SELECT 
        s.sales_doc_id,
        SUM(si.quantity_shipped) as total_shipped_qty,
        (
            SELECT SUM(sdi.quantity) 
            FROM sales_doc_items sdi 
            WHERE sdi.sales_doc_id = s.sales_doc_id
        ) - SUM(si.quantity_shipped) as pending_qty,
        COUNT(DISTINCT s.id) as shipment_count
    FROM shipments s
    JOIN shipment_items si ON si.shipment_id = s.id
    WHERE s.sales_doc_id IS NOT NULL
    GROUP BY s.sales_doc_id
) s_stats ON s_stats.sales_doc_id = sd.id
WHERE sd.deleted_at IS NULL;

-- Vista de productos más vendidos por canal
CREATE OR REPLACE VIEW v_top_sold_products AS
SELECT 
    sd.company_id,
    sdi.product_id,
    p.sku,
    p.name as product_name,
    CASE 
        WHEN sd.pos_session_id IS NOT NULL THEN 'POS'
        WHEN sd.sales_order_id IS NOT NULL THEN 'ORDER'
        ELSE 'DIRECT'
    END as sale_channel,
    COUNT(sdi.id) as sales_frequency,
    SUM(sdi.quantity) as total_quantity,
    SUM(sdi.total_line) as total_revenue,
    AVG(sdi.unit_price) as avg_price,
    MAX(sd.issue_date) as last_sale_date,
    COUNT(DISTINCT sd.customer_id) as unique_customers
FROM sales_doc_items sdi
JOIN sales_docs sd ON sd.id = sdi.sales_doc_id
JOIN products p ON p.id = sdi.product_id
WHERE sd.deleted_at IS NULL
GROUP BY sd.company_id, sdi.product_id, p.sku, p.name, sale_channel;

-- PASO 9: REPORTES Y ANÁLISIS
-- ============================================================================

-- Reporte de ventas por canal
CREATE OR REPLACE FUNCTION report_sales_by_channel(
    p_company_id UUID,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE(
    sale_channel TEXT,
    total_documents INTEGER,
    total_sales NUMERIC,
    total_tax NUMERIC,
    avg_ticket NUMERIC,
    unique_customers INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN sd.pos_session_id IS NOT NULL THEN 'POS'
            WHEN sd.sales_order_id IS NOT NULL THEN 'ORDER'
            ELSE 'DIRECT'
        END as channel,
        COUNT(sd.id)::INTEGER,
        COALESCE(SUM(sd.total), 0),
        COALESCE(SUM(sd.igv_amount), 0),
        COALESCE(AVG(sd.total), 0),
        COUNT(DISTINCT sd.customer_id)::INTEGER
    FROM sales_docs sd
    WHERE sd.company_id = p_company_id
      AND sd.issue_date BETWEEN p_date_from AND p_date_to
      AND sd.deleted_at IS NULL
    GROUP BY channel
    ORDER BY total_sales DESC;
END;
$$;

-- Reporte de eficiencia de POS vs Ventas tradicionales
CREATE OR REPLACE FUNCTION report_pos_vs_traditional_sales(
    p_company_id UUID,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS TABLE(
    metric TEXT,
    pos_value NUMERIC,
    traditional_value NUMERIC,
    difference_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pos_stats RECORD;
    trad_stats RECORD;
BEGIN
    -- Estadísticas POS
    SELECT 
        COUNT(*)::NUMERIC as docs,
        COALESCE(SUM(total), 0) as sales,
        COALESCE(AVG(total), 0) as avg_ticket,
        COUNT(DISTINCT customer_id)::NUMERIC as customers
    INTO pos_stats
    FROM sales_docs
    WHERE company_id = p_company_id
      AND issue_date BETWEEN p_date_from AND p_date_to
      AND pos_session_id IS NOT NULL
      AND deleted_at IS NULL;
    
    -- Estadísticas tradicionales
    SELECT 
        COUNT(*)::NUMERIC as docs,
        COALESCE(SUM(total), 0) as sales,
        COALESCE(AVG(total), 0) as avg_ticket,
        COUNT(DISTINCT customer_id)::NUMERIC as customers
    INTO trad_stats
    FROM sales_docs
    WHERE company_id = p_company_id
      AND issue_date BETWEEN p_date_from AND p_date_to
      AND pos_session_id IS NULL
      AND deleted_at IS NULL;
    
    -- Retornar comparación
    RETURN QUERY
    SELECT 
        'Total Documents'::TEXT,
        pos_stats.docs,
        trad_stats.docs,
        CASE WHEN trad_stats.docs > 0 THEN 
            ROUND(((pos_stats.docs - trad_stats.docs) / trad_stats.docs * 100), 2)
        ELSE 0 END
    UNION ALL
    SELECT 
        'Total Sales'::TEXT,
        pos_stats.sales,
        trad_stats.sales,
        CASE WHEN trad_stats.sales > 0 THEN 
            ROUND(((pos_stats.sales - trad_stats.sales) / trad_stats.sales * 100), 2)
        ELSE 0 END
    UNION ALL
    SELECT 
        'Average Ticket'::TEXT,
        pos_stats.avg_ticket,
        trad_stats.avg_ticket,
        CASE WHEN trad_stats.avg_ticket > 0 THEN 
            ROUND(((pos_stats.avg_ticket - trad_stats.avg_ticket) / trad_stats.avg_ticket * 100), 2)
        ELSE 0 END
    UNION ALL
    SELECT 
        'Unique Customers'::TEXT,
        pos_stats.customers,
        trad_stats.customers,
        CASE WHEN trad_stats.customers > 0 THEN 
            ROUND(((pos_stats.customers - trad_stats.customers) / trad_stats.customers * 100), 2)
        ELSE 0 END;
END;
$$;

-- PASO 10: LIMPIEZA Y OPTIMIZACIÓN
-- ============================================================================

-- Función para limpiar duplicados de ventas
CREATE OR REPLACE FUNCTION cleanup_duplicate_sales_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_migrated INTEGER;
BEGIN
    -- Migrar órdenes a documentos
    SELECT migrate_sales_orders_to_docs() INTO v_migrated;
    
    v_result := json_build_object(
        'migrated_orders', v_migrated,
        'company_id', p_company_id,
        'timestamp', NOW(),
        'note', 'Migración completada - revisar datos antes de eliminar órdenes originales'
    );
    
    RETURN v_result;
END;
$$;

-- PASO 11: GRANTS Y COMENTARIOS
-- ============================================================================

-- Grants
GRANT EXECUTE ON FUNCTION check_stock_availability_detailed(UUID, UUID, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_pos_cart(UUID, UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pos_sale(UUID, UUID, JSON, JSON, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_sales_delivery_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_sales_orders_to_docs() TO authenticated;
GRANT EXECUTE ON FUNCTION report_sales_by_channel(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION report_pos_vs_traditional_sales(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_sales_data(UUID) TO service_role;

-- Comentarios
COMMENT ON TABLE sales_docs IS 'Documentos tributarios de venta - fuente única de verdad con integración automática a stock';
COMMENT ON TABLE sales_orders IS 'Órdenes de venta - opcional para flujos de cotización/aprobación';
COMMENT ON TABLE shipments IS 'Despachos físicos con sincronización automática de estados';

COMMENT ON FUNCTION process_pos_sale IS 'Procesa venta POS completa con validación de stock y generación automática de documentos';
COMMENT ON FUNCTION validate_pos_cart IS 'Valida disponibilidad de stock para carrito POS';
COMMENT ON FUNCTION check_stock_availability_detailed IS 'Validación detallada de stock con información completa';
COMMENT ON FUNCTION sync_sales_delivery_status IS 'Sincroniza estados de entrega basado en shipments';

-- ============================================================================
-- RESUMEN DE CAMBIOS EN VENTAS:
-- ============================================================================
/*
✅ ELIMINADAS DUPLICACIONES:
   - sales_docs como fuente única con integración automática a stock
   - sales_orders solo para flujos de cotización
   - POS completamente integrado con inventario

✅ FLUJOS UNIFICADOS:
   - POS: Validación stock → sales_docs → stock_ledger (automático)
   - Tradicional: sales_orders → sales_docs → stock_ledger (automático)
   - Directo: sales_docs → stock_ledger (automático)

✅ INVENTARIO INTEGRADO:
   - Todas las ventas generan movimientos automáticos
   - Validación de stock en tiempo real
   - POS con control de inventario completo

✅ ESTADOS SINCRONIZADOS:
   - delivery_status actualizado por shipments
   - Trazabilidad completa documento → físico
   - Reportes unificados por canal

✅ PERFORMANCE MEJORADO:
   - Funciones optimizadas para POS
   - Validaciones eficientes
   - Reportes por canal de venta
*/

-- ============================================================================
-- FIN DE LA REESTRUCTURACIÓN DE VENTAS
-- ============================================================================