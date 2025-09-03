-- ============================================================================
-- DATOS DE PRUEBA PARA EL SISTEMA ERP (UUIDs CORREGIDOS)
-- ============================================================================

-- Limpieza de tablas (opcional, útil para re-ejecutar el script)
TRUNCATE TABLE
    public.companies,
    public.roles,
    public.user_companies,
    public.branches,
    public.warehouses,
    public.warehouse_zones,
    --public.storage_locations,
    public.parties,
    public.party_contacts,
    public.brands,
    public.categories,
    public.products,
    public.price_lists,
    public.price_list_items,
    public.purchase_docs,
    public.purchase_doc_items,
    public.sales_docs,
    public.sales_doc_items,
    public.stock_ledger,
    public.warehouse_stock,
    -- public.warehouse_stock_location,
    public.exchange_rates
    RESTART IDENTITY CASCADE;

-- PASO 1: CATÁLOGOS SUNAT
-- ============================================================================

INSERT INTO sunat.cat_02_monedas (code, descripcion) VALUES
('PEN', 'Soles'),
('USD', 'Dólares Americanos');
('CLP', 'Pesos Chilenos');

INSERT INTO sunat.cat_06_doc_identidad (code, descripcion) VALUES
('1', 'DNI'),
('6', 'RUC'),
('7', 'Pasaporte');

INSERT INTO sunat.cat_07_afect_igv (code, descripcion) VALUES
('10', 'Gravado - Operación Onerosa'),
('20', 'Exonerado - Operación Onerosa'),
('30', 'Inafecto - Operación Onerosa');

INSERT INTO sunat.cat_10_tipo_documento (code, descripcion) VALUES
('01', 'Factura'),
('03', 'Boleta de Venta'),
('09', 'Guía de Remisión Remitente');

INSERT INTO sunat.cat_17_tipo_operacion (code, descripcion) VALUES
('01', 'Venta Interna'),
('02', 'Compra Interna');

INSERT INTO sunat.cat_06_unidades_medida (code, descripcion) VALUES
('NIU', 'Unidad'),
('KGM', 'Kilogramo'),
('LTR', 'Litro');

INSERT INTO sunat.ubigeo (code, departamento, provincia, distrito) VALUES
('150101', 'LIMA', 'LIMA', 'LIMA');

-- PASO 2: EMPRESA, ROLES Y USUARIOS
-- ============================================================================

-- Crear una empresa de ejemplo
INSERT INTO public.companies (id, ruc, legal_name, trade_name, currency_code, valuation_method)
VALUES ('123e4567-e89b-12d3-a456-426614174000', '20123456789', 'Mi Empresa S.A.C.', 'Mi Tienda Online', 'PEN', 'PROMEDIO_MOVIL');

-- Crear un rol de administrador
INSERT INTO public.roles (id, name, description, permissions)
VALUES ('123e4567-e89b-12d3-a456-426614174001', 'Administrador', 'Acceso total al sistema', '["*"]'::jsonb);

-- Asignar la empresa a un usuario (reemplazar con un user_id de auth.users)
-- Este es un UUID de ejemplo. En un entorno real, obtén el ID de un usuario autenticado.


-- PASO 3: ESTRUCTURA DE ALMACÉN
-- ============================================================================

INSERT INTO public.warehouses (id, company_id, code, name)
VALUES ('123e4567-e89b-12d3-a456-426614174002', '123e4567-e89b-12d3-a456-426614174000', 'ALM-01', 'Almacén Principal');

INSERT INTO public.warehouse_zones (id, company_id, warehouse_id, code, name)
VALUES ('123e4567-e89b-12d3-a456-426614174003', '123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174002', 'ZONA-A', 'Zona de Picking');

/* INSERT INTO public.storage_locations (company_id, warehouse_id, zone_id, code, name)
VALUES ('123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174002', '123e4567-e89b-12d3-a456-426614174003', 'A01-R01-S01', 'Estante 1, Nivel 1'); */

-- PASO 4: PRODUCTOS, MARCAS Y CATEGORÍAS
-- ============================================================================

INSERT INTO public.brands (id, company_id, name) VALUES ('123e4567-e89b-12d3-a456-426614174004', '123e4567-e89b-12d3-a456-426614174000', 'Genérica');
INSERT INTO public.categories (id, company_id, name) VALUES ('123e4567-e89b-12d3-a456-426614174005', '123e4567-e89b-12d3-a456-426614174000', 'Electrónica');

INSERT INTO public.products (id, company_id, sku, name, brand_id, category_id, unit_code, tipo_afectacion)
VALUES 
    ('123e4567-e89b-12d3-a456-426614174006', '123e4567-e89b-12d3-a456-426614174000', 'ELEC-001', 'Laptop Gamer XYZ', '123e4567-e89b-12d3-a456-426614174004', '123e4567-e89b-12d3-a456-426614174005', 'NIU', '10'),
    ('123e4567-e89b-12d3-a456-426614174007', '123e4567-e89b-12d3-a456-426614174000', 'ELEC-002', 'Mouse Inalámbrico', '123e4567-e89b-12d3-a456-426614174004', '123e4567-e89b-12d3-a456-426614174005', 'NIU', '10');

-- PASO 5: CLIENTES Y PROVEEDORES
-- ============================================================================

INSERT INTO public.parties (id, company_id, is_customer, is_supplier, doc_type, doc_number, razon_social)
VALUES
    ('123e4567-e89b-12d3-a456-426614174008', '123e4567-e89b-12d3-a456-426614174000', true, false, '1', '12345678', 'Cliente Final Genérico'),
    ('123e4567-e89b-12d3-a456-426614174009', '123e4567-e89b-12d3-a456-426614174000', false, true, '6', '20987654321', 'Proveedor de Tecnología S.A.');

-- PASO 6: LISTAS DE PRECIOS
-- ============================================================================

INSERT INTO public.price_lists (id, company_id, name, currency_code, is_default)
VALUES ('123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174000', 'Lista de Precios General PEN', 'PEN', true);

INSERT INTO public.price_list_items (company_id, price_list_id, product_id, unit_price, valid_from)
VALUES
    ('123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174006', 4500.00, '2025-01-01'),
    ('123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174010', '123e4567-e89b-12d3-a456-426614174007', 80.00, '2025-01-01');

-- PASO 7: TIPOS DE CAMBIO
-- ============================================================================

INSERT INTO public.exchange_rates (rate_date, from_currency_code, to_currency_code, rate)
VALUES
    (CURRENT_DATE - 1, 'USD', 'PEN', 3.75),
    (CURRENT_DATE, 'USD', 'PEN', 3.78);
    (CURRENT_DATE - 2, 'CLP', 'PEN', 0.00366),
    (CURRENT_DATE - 1, 'CLP', 'PEN', 0.00364),
    (CURRENT_DATE, 'CLP', 'PEN', 0.00365);

-- PASO 8: COMPRAS (ESTO GENERARÁ MOVIMIENTOS DE INVENTARIO)
-- ============================================================================

