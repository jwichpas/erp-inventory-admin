-- ============================================================================
-- CORRECCIÓN DE RELACIONES DE USUARIO EN POS
-- ============================================================================
-- Fecha: 2025-09-03
-- Propósito: Crear funciones para obtener información de usuario en POS sessions
-- ============================================================================

-- Función para obtener información básica de usuarios para POS
CREATE OR REPLACE FUNCTION get_pos_user_info(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_info JSON;
    v_full_name TEXT;
    v_email TEXT;
BEGIN
    -- Intentar obtener información del usuario desde auth.users
    SELECT 
        au.email,
        COALESCE(
            au.raw_user_meta_data->>'full_name',
            au.raw_user_meta_data->>'name',
            au.email
        ) as full_name
    INTO v_email, v_full_name
    FROM auth.users au
    WHERE au.id = p_user_id;
    
    -- Si no se encuentra el usuario, usar valores por defecto
    IF NOT FOUND THEN
        v_email := 'usuario@unknown.com';
        v_full_name := 'Usuario Desconocido';
    END IF;
    
    v_user_info := json_build_object(
        'id', p_user_id,
        'email', v_email,
        'full_name', v_full_name
    );
    
    RETURN v_user_info;
END;
$$;

-- Función para obtener estadísticas de sesión POS con información de usuario
CREATE OR REPLACE FUNCTION get_pos_session_with_user_info(
    p_company_id UUID,
    p_date_from DATE DEFAULT CURRENT_DATE,
    p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    session_id UUID,
    user_id UUID,
    user_info JSON,
    warehouse_id UUID,
    warehouse_name TEXT,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    opening_amount NUMERIC,
    closing_amount NUMERIC,
    expected_amount NUMERIC,
    difference NUMERIC,
    status TEXT,
    sales_count INTEGER,
    total_sales NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.user_id,
        get_pos_user_info(ps.user_id) as user_info,
        ps.warehouse_id,
        w.name as warehouse_name,
        ps.opened_at,
        ps.closed_at,
        ps.opening_amount,
        ps.closing_amount,
        ps.expected_amount,
        ps.difference,
        ps.status,
        COALESCE(sales_stats.sales_count, 0)::INTEGER,
        COALESCE(sales_stats.total_sales, 0)
    FROM pos_sessions ps
    JOIN warehouses w ON w.id = ps.warehouse_id
    LEFT JOIN (
        SELECT 
            sd.pos_session_id,
            COUNT(sd.id) as sales_count,
            SUM(sd.total) as total_sales
        FROM sales_docs sd
        WHERE sd.deleted_at IS NULL
        GROUP BY sd.pos_session_id
    ) sales_stats ON sales_stats.pos_session_id = ps.id
    WHERE ps.company_id = p_company_id
      AND ps.opened_at::DATE BETWEEN p_date_from AND p_date_to
    ORDER BY ps.opened_at DESC;
END;
$$;

-- Vista materializada para sesiones POS con información completa (opcional)
-- Esta es más eficiente para consultas frecuentes
CREATE OR REPLACE VIEW v_pos_sessions_with_info AS
SELECT 
    ps.id,
    ps.company_id,
    ps.user_id,
    ps.warehouse_id,
    w.name as warehouse_name,
    ps.opened_at,
    ps.closed_at,
    ps.opening_amount,
    ps.closing_amount,
    ps.expected_amount,
    ps.difference,
    ps.status,
    ps.notes,
    ps.created_at,
    ps.updated_at,
    -- Sales statistics
    COALESCE(sales_stats.sales_count, 0) as sales_count,
    COALESCE(sales_stats.total_sales, 0) as total_sales,
    COALESCE(sales_stats.cash_sales, 0) as cash_sales,
    COALESCE(sales_stats.card_sales, 0) as card_sales
FROM pos_sessions ps
JOIN warehouses w ON w.id = ps.warehouse_id
LEFT JOIN (
    SELECT 
        sd.pos_session_id,
        COUNT(sd.id) as sales_count,
        SUM(sd.total) as total_sales,
        SUM(CASE WHEN pp.payment_type = 'CASH' THEN pp.amount ELSE 0 END) as cash_sales,
        SUM(CASE WHEN pp.payment_type IN ('CARD', 'TRANSFER') THEN pp.amount ELSE 0 END) as card_sales
    FROM sales_docs sd
    LEFT JOIN pos_payments pp ON pp.sales_doc_id = sd.id
    WHERE sd.deleted_at IS NULL
    GROUP BY sd.pos_session_id
) sales_stats ON sales_stats.pos_session_id = ps.id
WHERE ps.deleted_at IS NULL;

-- Función mejorada para obtener estadísticas de sesión POS
CREATE OR REPLACE FUNCTION get_pos_session_stats(session_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSON;
    v_session RECORD;
    v_today_sales NUMERIC := 0;
    v_today_transactions INTEGER := 0;
    v_cash_amount NUMERIC := 0;
    v_card_amount NUMERIC := 0;
BEGIN
    -- Obtener información básica de la sesión
    SELECT * INTO v_session
    FROM pos_sessions
    WHERE id = session_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Session not found');
    END IF;
    
    -- Calcular estadísticas de ventas para la sesión
    SELECT 
        COALESCE(COUNT(sd.id), 0),
        COALESCE(SUM(sd.total), 0),
        COALESCE(SUM(CASE WHEN pp.payment_type = 'CASH' THEN pp.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN pp.payment_type IN ('CARD', 'TRANSFER') THEN pp.amount ELSE 0 END), 0)
    INTO 
        v_today_transactions,
        v_today_sales,
        v_cash_amount,
        v_card_amount
    FROM sales_docs sd
    LEFT JOIN pos_payments pp ON pp.sales_doc_id = sd.id
    WHERE sd.pos_session_id = session_id
      AND sd.deleted_at IS NULL;
    
    v_stats := json_build_object(
        'session_id', session_id,
        'todaySales', v_today_sales,
        'todayTransactions', v_today_transactions,
        'cashAmount', v_cash_amount,
        'cardAmount', v_card_amount,
        'averageTicket', CASE 
            WHEN v_today_transactions > 0 THEN v_today_sales / v_today_transactions 
            ELSE 0 
        END,
        'openingAmount', v_session.opening_amount,
        'expectedCash', v_session.opening_amount + v_cash_amount
    );
    
    RETURN v_stats;
END;
$$;

-- Grants para las funciones
GRANT EXECUTE ON FUNCTION get_pos_user_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_session_with_user_info(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_session_stats(UUID) TO authenticated;
GRANT SELECT ON TABLE v_pos_sessions_with_info TO authenticated;

-- Comentarios
COMMENT ON FUNCTION get_pos_user_info IS 'Obtiene información básica del usuario para sesiones POS';
COMMENT ON FUNCTION get_pos_session_with_user_info IS 'Lista sesiones POS con información completa de usuario y ventas';
COMMENT ON FUNCTION get_pos_session_stats IS 'Estadísticas detalladas de una sesión POS específica';
COMMENT ON VIEW v_pos_sessions_with_info IS 'Vista con información completa de sesiones POS y estadísticas de ventas';

-- ============================================================================
-- FIN DE LA CORRECCIÓN DE RELACIONES DE USUARIO EN POS
-- ============================================================================