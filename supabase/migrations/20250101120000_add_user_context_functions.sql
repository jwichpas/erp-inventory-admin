-- ============================================================================
-- USER CONTEXT AND COMPANY ACCESS FUNCTIONS
-- ============================================================================
-- Migration: Add missing user context and company access functions
-- Date: 2025-01-01
-- Purpose: Add functions for user context management and company access validation
-- ============================================================================

-- PASO 1: FUNCIÓN PARA ESTABLECER CONTEXTO DE USUARIO
-- ============================================================================

-- Función para establecer el contexto del usuario actual (empresa activa, etc.)
-- Esta función se usa para mantener el contexto de la empresa seleccionada por el usuario
-- Versión compatible con PostgREST que acepta un objeto JSON
CREATE OR REPLACE FUNCTION public.set_user_context(context_data JSONB DEFAULT '{}'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_access BOOLEAN := FALSE;
    p_company_id UUID;
    p_warehouse_id UUID;
    p_branch_id UUID;
    result JSONB := '{"success": true}'::JSONB;
BEGIN
    -- Obtener el ID del usuario autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN '{"success": false, "error": "Usuario no autenticado"}'::JSONB;
    END IF;

    -- Extraer parámetros del JSON
    p_company_id := (context_data->>'company_id')::UUID;
    p_warehouse_id := (context_data->>'warehouse_id')::UUID;
    p_branch_id := (context_data->>'branch_id')::UUID;

    -- Si se proporciona company_id, verificar que el usuario tenga acceso
    IF p_company_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 
            FROM public.user_companies uc
            WHERE uc.user_id = v_user_id
              AND uc.company_id = p_company_id
              AND uc.is_active = TRUE
              AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
        ) INTO v_has_access;

        IF NOT v_has_access THEN
            RETURN '{"success": false, "error": "Usuario no tiene acceso a la empresa especificada"}'::JSONB;
        END IF;

        -- Establecer el contexto de la empresa en la sesión
        PERFORM set_config('app.current_company_id', p_company_id::TEXT, TRUE);
        result := result || jsonb_build_object('company_id', p_company_id);
    END IF;

    -- Establecer contexto de almacén si se proporciona
    IF p_warehouse_id IS NOT NULL THEN
        -- Verificar que el almacén pertenezca a la empresa (si se especificó)
        IF p_company_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 
                FROM public.warehouses w
                WHERE w.id = p_warehouse_id
                  AND w.company_id = p_company_id
            ) INTO v_has_access;

            IF NOT v_has_access THEN
                RETURN '{"success": false, "error": "El almacén no pertenece a la empresa especificada"}'::JSONB;
            END IF;
        END IF;

        PERFORM set_config('app.current_warehouse_id', p_warehouse_id::TEXT, TRUE);
        result := result || jsonb_build_object('warehouse_id', p_warehouse_id);
    END IF;

    -- Establecer contexto de sucursal si se proporciona
    IF p_branch_id IS NOT NULL THEN
        -- Verificar que la sucursal pertenezca a la empresa (si se especificó)
        IF p_company_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 
                FROM public.branches b
                WHERE b.id = p_branch_id
                  AND b.company_id = p_company_id
            ) INTO v_has_access;

            IF NOT v_has_access THEN
                RETURN '{"success": false, "error": "La sucursal no pertenece a la empresa especificada"}'::JSONB;
            END IF;
        END IF;

        PERFORM set_config('app.current_branch_id', p_branch_id::TEXT, TRUE);
        result := result || jsonb_build_object('branch_id', p_branch_id);
    END IF;

    -- Establecer el ID del usuario en el contexto
    PERFORM set_config('app.current_user_id', v_user_id::TEXT, TRUE);
    result := result || jsonb_build_object('user_id', v_user_id);

    RETURN result;
END;
$$;

-- Función simplificada para establecer solo la empresa (más común)
CREATE OR REPLACE FUNCTION public.set_current_company(company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_access BOOLEAN := FALSE;
BEGIN
    -- Obtener el ID del usuario autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN '{"success": false, "error": "Usuario no autenticado"}'::JSONB;
    END IF;

    IF company_id IS NULL THEN
        RETURN '{"success": false, "error": "company_id es requerido"}'::JSONB;
    END IF;

    -- Verificar que el usuario tenga acceso a la empresa
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_companies uc
        WHERE uc.user_id = v_user_id
          AND uc.company_id = company_id
          AND uc.is_active = TRUE
          AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RETURN '{"success": false, "error": "Usuario no tiene acceso a la empresa especificada"}'::JSONB;
    END IF;

    -- Establecer el contexto
    PERFORM set_config('app.current_company_id', company_id::TEXT, TRUE);
    PERFORM set_config('app.current_user_id', v_user_id::TEXT, TRUE);

    -- Actualizar último login
    PERFORM public.update_user_company_login(company_id, v_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'company_id', company_id,
        'user_id', v_user_id
    );
END;
$$;

-- PASO 2: FUNCIÓN PARA OBTENER CONTEXTO ACTUAL DEL USUARIO
-- ============================================================================

-- Función para obtener el contexto actual del usuario (empresa, almacén, sucursal)
CREATE OR REPLACE FUNCTION public.get_user_context()
RETURNS TABLE(
    user_id UUID,
    company_id UUID,
    warehouse_id UUID,
    branch_id UUID,
    company_name TEXT,
    warehouse_name TEXT,
    branch_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_warehouse_id UUID;
    v_branch_id UUID;
    v_company_name TEXT;
    v_warehouse_name TEXT;
    v_branch_name TEXT;
BEGIN
    -- Obtener valores del contexto de la sesión
    v_user_id := COALESCE(
        NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
        auth.uid()
    );
    
    v_company_id := NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID;
    v_warehouse_id := NULLIF(current_setting('app.current_warehouse_id', TRUE), '')::UUID;
    v_branch_id := NULLIF(current_setting('app.current_branch_id', TRUE), '')::UUID;

    -- Obtener nombres si hay IDs
    IF v_company_id IS NOT NULL THEN
        SELECT c.legal_name INTO v_company_name
        FROM public.companies c
        WHERE c.id = v_company_id;
    END IF;

    IF v_warehouse_id IS NOT NULL THEN
        SELECT w.name INTO v_warehouse_name
        FROM public.warehouses w
        WHERE w.id = v_warehouse_id;
    END IF;

    IF v_branch_id IS NOT NULL THEN
        SELECT b.name INTO v_branch_name
        FROM public.branches b
        WHERE b.id = v_branch_id;
    END IF;

    -- Retornar el contexto
    RETURN QUERY
    SELECT 
        v_user_id,
        v_company_id,
        v_warehouse_id,
        v_branch_id,
        v_company_name,
        v_warehouse_name,
        v_branch_name;
END;
$$;

-- PASO 3: FUNCIONES COMPATIBLES CON POSTGREST
-- ============================================================================

-- Función para validar acceso a empresa (compatible con PostgREST)
CREATE FUNCTION public.auth_has_company_access(
    company_id UUID,
    user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_companies uc
        WHERE uc.user_id = $2
          AND uc.company_id = $1
          AND uc.is_active = TRUE
          AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
    );
$$;

-- Función para obtener permisos del usuario (compatible con PostgREST)
CREATE FUNCTION public.get_user_permissions(
    company_id UUID,
    user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(uc.permissions_override, r.permissions, '[]'::jsonb)
    FROM public.user_companies uc
    JOIN public.roles r ON r.id = uc.role_id
    WHERE uc.user_id = $2
      AND uc.company_id = $1
      AND uc.is_active = TRUE
      AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
    LIMIT 1;
$$;

-- Función para verificar permiso específico (compatible con PostgREST)
CREATE FUNCTION public.user_has_permission(
    permission TEXT,
    company_id UUID DEFAULT NULLIF(current_setting('app.current_company_id', TRUE), '')::UUID,
    user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_permissions JSONB;
    v_company_id UUID := company_id;
    v_user_id UUID := user_id;
BEGIN
    -- Si no hay empresa en contexto, no hay permisos
    IF v_company_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Obtener permisos del usuario
    SELECT public.get_user_permissions(v_company_id, v_user_id) INTO v_permissions;

    -- Verificar si tiene el permiso específico o permisos de administrador
    RETURN (
        v_permissions ? '*' OR
        v_permissions ? permission
    );
END;
$$;

-- Función para obtener empresas del usuario (compatible con PostgREST)
CREATE FUNCTION public.get_user_companies(
    user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    company_ruc TEXT,
    company_legal_name TEXT,
    company_commercial_name TEXT,
    role_id UUID,
    role_name TEXT,
    permissions JSONB,
    is_active BOOLEAN,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := user_id;
BEGIN
    -- Verificar que el usuario esté autenticado
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Retornar las empresas del usuario con información completa
    RETURN QUERY
    SELECT 
        c.id as company_id,
        c.legal_name::TEXT as company_name,
        c.ruc::TEXT as company_ruc,
        c.legal_name::TEXT as company_legal_name,
        COALESCE(c.trade_name, c.legal_name)::TEXT as company_commercial_name,
        r.id as role_id,
        r.name::TEXT as role_name,
        COALESCE(uc.permissions_override, r.permissions) as permissions,
        uc.is_active,
        uc.valid_from,
        uc.valid_until,
        uc.last_login_at
    FROM public.user_companies uc
    JOIN public.companies c ON c.id = uc.company_id
    JOIN public.roles r ON r.id = uc.role_id
    WHERE uc.user_id = v_user_id
      AND uc.is_active = TRUE
      AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
      AND c.deleted_at IS NULL
    ORDER BY c.legal_name;
END;
$$;

-- Función para actualizar último login (compatible con PostgREST)
CREATE FUNCTION public.update_user_company_login(
    company_id UUID,
    user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID := company_id;
    v_user_id UUID := user_id;
BEGIN
    -- Actualizar último login y contador
    UPDATE public.user_companies
    SET 
        last_login_at = NOW(),
        login_count = COALESCE(login_count, 0) + 1,
        updated_at = NOW()
    WHERE user_id = v_user_id
      AND company_id = v_company_id
      AND is_active = TRUE;

    RETURN FOUND;
END;
$$;

-- PASO 4: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON FUNCTION public.set_user_context(JSONB) IS 
'Establece el contexto del usuario para la sesión actual (empresa, almacén, sucursal)';

COMMENT ON FUNCTION public.set_current_company(UUID) IS 
'Establece la empresa actual para el usuario autenticado';

COMMENT ON FUNCTION public.get_user_context() IS 
'Obtiene el contexto actual del usuario (empresa, almacén, sucursal activos)';

COMMENT ON FUNCTION public.auth_has_company_access(UUID, UUID) IS 
'Verifica si un usuario tiene acceso a una empresa específica (compatible con PostgREST)';

COMMENT ON FUNCTION public.get_user_permissions(UUID, UUID) IS 
'Obtiene todos los permisos de un usuario en una empresa específica (compatible con PostgREST)';

COMMENT ON FUNCTION public.user_has_permission(TEXT, UUID, UUID) IS 
'Verifica si un usuario tiene un permiso específico en una empresa (compatible con PostgREST)';

COMMENT ON FUNCTION public.get_user_companies(UUID) IS 
'Obtiene todas las empresas a las que tiene acceso un usuario (compatible con PostgREST)';

COMMENT ON FUNCTION public.update_user_company_login(UUID, UUID) IS 
'Actualiza la fecha del último login del usuario en una empresa (compatible con PostgREST)';

-- PASO 5: GRANTS DE SEGURIDAD
-- ============================================================================

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.set_user_context(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_company_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_companies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_company_login(UUID, UUID) TO authenticated;

-- También permitir al service_role para operaciones administrativas
GRANT EXECUTE ON FUNCTION public.set_user_context(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_current_company(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_context() TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_has_company_access(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_permission(TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_companies(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_company_login(UUID, UUID) TO service_role;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================