-- Contenido de C:\Proyectos\sistema-erp-inventario\supabase\migrations\20250823100202_sistema_erp_migrations.sql
-- ============================================================================
-- SISTEMA ERP - SCHEMA OPTIMIZADO PARA POSTGRESQL 15+ (CONSOLIDADO)
-- ============================================================================
--
-- Esta migración consolida las versiones del 13/08/2025 y 19/08/2025.
-- Prioriza optimizaciones de la versión más reciente, fusiona tablas y funciones,
-- elimina duplicados y asegura compatibilidad con Supabase.
--
-- Autor: Sistema ERP (Consolidado por Grok)
-- Fecha: 23/08/2025
-- PostgreSQL Version: 15+
-- ============================================================================

-- CONFIGURACIONES RECOMENDADAS postgresql.conf
-- shared_buffers = 256MB (25% del RAM)
-- effective_cache_size = 1GB (75% del RAM)
-- random_page_cost = 1.1 (SSDs)
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- maintenance_work_mem = 64MB
-- work_mem = 4MB

-- PASO 1: EXTENSIONES Y CONFIGURACIÓN INICIAL
-- ============================================================================

-- Habilitar extensiones críticas (fusionadas de ambas versiones)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Búsquedas textuales fuzzy
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- Índices compuestos optimizados
CREATE EXTENSION IF NOT EXISTS "btree_gist";    -- Rangos y overlaps
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS "bloom";         -- Filtros bloom para lookups

-- FUNCIÓN UNIVERSAL PARA TIMESTAMPS (versión optimizada)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

-- PASO 2: ESQUEMAS Y DOMINIOS CUSTOMIZADOS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS sunat;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS partitions;

-- Dominios para consistencia de datos
CREATE DOMAIN monetary AS NUMERIC(18,6) CHECK (VALUE >= 0);
CREATE DOMAIN percentage AS NUMERIC(5,4) CHECK (VALUE >= 0 AND VALUE <= 100);
CREATE DOMAIN quantity AS NUMERIC(18,6) CHECK (VALUE >= 0);
/* CREATE DOMAIN ruc_pe AS VARCHAR(11) CHECK (VALUE ~ '^\d{11}$'); */
CREATE DOMAIN email_address AS TEXT CHECK (VALUE ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

-- PASO 3: TABLAS DE CATÁLOGOS SUNAT (OPTIMIZADAS Y FUSIONADAS)
-- ============================================================================

-- Tabla maestra de catálogos SUNAT con compresión (versión optimizada)
CREATE UNLOGGED TABLE IF NOT EXISTS sunat.catalogs (
    catalog_code VARCHAR(10) NOT NULL,
    item_code VARCHAR(10) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (catalog_code, item_code)
) WITH (fillfactor = 90, autovacuum_enabled = true);

-- Catálogo 06: Tipo de documento de identidad
create table if not exists sunat.cat_06_doc_identidad (
  code varchar(1) primary key, -- '1','6','7','A','B', etc.
  descripcion text not null
);

-- Catálogo 02: Monedas ISO 4217
create table if not exists sunat.cat_02_monedas (
  code varchar(3) primary key, -- 'PEN','USD', etc.
  descripcion text not null
);

-- Vistas materializadas para catálogos frecuentes
CREATE MATERIALIZED VIEW sunat.doc_identidad AS
SELECT item_code as code, description as descripcion
FROM sunat.catalogs
WHERE catalog_code = '06' AND is_active = true;


CREATE UNIQUE INDEX ON sunat.doc_identidad (code);

CREATE MATERIALIZED VIEW sunat.monedas AS
SELECT item_code as code, description as descripcion
FROM sunat.catalogs
WHERE catalog_code = '02' AND is_active = true;

CREATE UNIQUE INDEX ON sunat.monedas (code);

-- Otras tablas de catálogos SUNAT (de la versión base, integradas)
CREATE TABLE IF NOT EXISTS sunat.cat_10_tipo_documento (
  code varchar(2) primary key,
  descripcion text not null
);

CREATE TABLE IF NOT EXISTS sunat.cat_12_tipo_operacion (
  code varchar(2) primary key,
  descripcion text not null
);

CREATE TABLE IF NOT EXISTS sunat.cat_07_afect_igv (
  code varchar(2) primary key,
  descripcion text not null
);

CREATE TABLE IF NOT EXISTS sunat.cat_17_tipo_operacion (
  code varchar(2) primary key,
  descripcion text not null
);

CREATE TABLE IF NOT EXISTS sunat.cat_18_modalidad_traslado (
  code varchar(2) primary key,
  descripcion text not null
);

CREATE TABLE IF NOT EXISTS sunat.cat_20_motivo_traslado (
  code varchar(2) primary key,
  descripcion text not null
);

CREATE TABLE IF NOT EXISTS sunat.cat_06_unidades_medida (
  code varchar(10) primary key,
  descripcion text not null
);

CREATE TABLE IF NOT EXISTS sunat.ubigeo (
  code varchar(6) primary key,
  departamento text,
  provincia text,
  distrito text
);

-- PASO 4: SISTEMA DE ROLES Y PERMISOS (JSONB OPTIMIZADO, FUSIONADO)
-- ============================================================================

CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    constraints JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    hierarchy_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_roles_name UNIQUE (name),
    CONSTRAINT chk_permissions_array CHECK (jsonb_typeof(permissions) = 'array'),
    CONSTRAINT chk_hierarchy_level CHECK (hierarchy_level BETWEEN 0 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON public.roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_permissions ON public.roles USING GIN(permissions);

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- PASO 5: EMPRESAS CON ENCRIPTACIÓN Y AUDITORÍA (VERSIÓN OPTIMIZADA)
-- ============================================================================

CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruc VARCHAR(11) NOT NULL UNIQUE,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    email email_address,
    phone TEXT,
    address TEXT,
    ubigeo_code VARCHAR(6) REFERENCES sunat.ubigeo(code),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'PEN',
    valuation_method TEXT NOT NULL DEFAULT 'PROMEDIO_MOVIL'
        CHECK (valuation_method IN ('FIFO', 'PROMEDIO_MOVIL', 'LIFO')),

    -- Facturación electrónica (encriptada)
    sol_user TEXT,
    sol_pass TEXT, -- Será encriptada con pgcrypto
    cert_path TEXT,
    client_id TEXT,
    client_secret TEXT,
    production BOOLEAN NOT NULL DEFAULT false,

    -- Configuraciones avanzadas
    business_config JSONB DEFAULT '{}'::jsonb,
    integrations JSONB DEFAULT '{}'::jsonb,

    -- Campos de auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);

-- Función para encriptar datos sensibles
CREATE OR REPLACE FUNCTION encrypt_sensitive_company_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Encriptar contraseña SOL si está presente
    IF NEW.sol_pass IS NOT NULL AND NEW.sol_pass != OLD.sol_pass THEN
        NEW.sol_pass = crypt(NEW.sol_pass, gen_salt('bf', 8));
    END IF;

    -- Encriptar client_secret si está presente
    IF NEW.client_secret IS NOT NULL AND NEW.client_secret != OLD.client_secret THEN
        NEW.client_secret = pgp_sym_encrypt(NEW.client_secret, 'empresa_secret_key');
    END IF;

    NEW.updated_at = NOW();
    NEW.version = COALESCE(OLD.version, 0) + 1;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_encrypt_company_data
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_sensitive_company_data();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- PASO 6: USER_COMPANIES CON RLS AVANZADO (FUSIONADO)
-- ============================================================================

CREATE TABLE public.user_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions_override JSONB DEFAULT '[]'::jsonb,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_user_companies_active UNIQUE (user_id, company_id),
    CONSTRAINT chk_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_role_id ON public.user_companies(role_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_is_active ON public.user_companies(is_active);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_company ON public.user_companies(user_id, company_id);

CREATE TRIGGER update_user_companies_updated_at
    BEFORE UPDATE ON public.user_companies
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- PASO 7: SUCURSALES, ALMACENES Y ZONAS (DE VERSIÓN BASE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  address text,
  ubigeo_code varchar(6) references sunat.ubigeo(code),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(company_id, code)
);

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  code text not null,
  name text not null,

  -- Dimensiones físicas totales del almacén (en metros)
  width numeric(18,6) not null default 0,
  height numeric(18,6) not null default 0,
  length numeric(18,6) not null default 0,
  total_area numeric(18,6) generated always as (width * length) stored,
  total_volume numeric(18,6) generated always as (width * length * height) stored,

  -- Información de ubicación física
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  latitude numeric(10,8),    -- Coordenadas GPS
  longitude numeric(11,8),   -- Coordenadas GPS

  -- Configuración del almacén
  warehouse_type text DEFAULT 'GENERAL' CHECK (warehouse_type IN (
    'GENERAL', 'COLD_STORAGE', 'HAZARDOUS', 'BONDED', 'HIGH_VALUE', 'BULK_STORAGE'
  )),
  temperature_zone text CHECK (temperature_zone IN (
    'AMBIENT', 'REFRIGERATED', 'FROZEN', 'CONTROLLED'
  )),
  max_capacity_kg numeric(18,6),
  current_capacity_kg numeric(18,6) DEFAULT 0,

  -- Estado operacional
  is_active boolean DEFAULT true,
  operational_status text DEFAULT 'OPERATIONAL' CHECK (operational_status IN (
    'OPERATIONAL', 'MAINTENANCE', 'CLOSED', 'UNDER_CONSTRUCTION'
  )),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(company_id, code)
);

CREATE INDEX idx_warehouses_company ON warehouses(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_branch ON warehouses(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_geo ON warehouses(latitude, longitude) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_type ON warehouses(warehouse_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouses_status ON warehouses(operational_status) WHERE deleted_at IS NULL;

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS warehouse_zones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  code text not null,
  name text,
  -- Dimensiones físicas
  width numeric(18,6) not null default 0,
  height numeric(18,6) not null default 0,
  length numeric(18,6) not null default 0,
  capacity_kg numeric(18,6),

  -- Coordenadas de posición (en metros desde el punto de origen del almacén)
  x_coordinate numeric(18,6) DEFAULT 0, -- Distancia horizontal desde origen
  y_coordinate numeric(18,6) DEFAULT 0, -- Distancia vertical desde origen
  z_coordinate numeric(18,6) DEFAULT 0, -- Altura (para almacenes multi-nivel)
  rotation_degrees numeric(18,6) DEFAULT 0, -- Rotación de la zona

  -- Tipo de forma y definición
  shape_type text DEFAULT 'RECTANGLE' CHECK (shape_type IN ('RECTANGLE', 'SQUARE', 'CIRCLE', 'POLYGON')),
  vertices jsonb DEFAULT '[]'::jsonb, -- Para formas poligonales: [{"x":0, "y":0}, {"x":5, "y":0}, {"x":5, "y":3}, {"x":0, "y":3}]

  -- Metadata visual
  color_hex text DEFAULT '#3B82F6' CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  opacity numeric(3,2) DEFAULT 0.7 CHECK (opacity BETWEEN 0 AND 1),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(warehouse_id, code)
);

-- PASO 8: PARTIES Y CONTACTOS (DE VERSIÓN BASE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS parties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  is_customer boolean not null default false,
  is_supplier boolean not null default false,
  doc_type varchar(1) not null references sunat.cat_06_doc_identidad(code),
  doc_number text not null,
  apellido_paterno text,
  apellido_materno text,
  nombres text,
  razon_social text,
  fullname text,
  email text,
  phone text,
  address text,
  ubigeo_code varchar(6) references sunat.ubigeo(code),
  country_code varchar(2) default 'PE',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(company_id, doc_type, doc_number),
  check (is_customer or is_supplier)
);

CREATE INDEX IF NOT EXISTS idx_parties_doc ON parties(company_id, doc_type, doc_number);
CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON parties FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS party_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  party_id uuid not null references parties(id) on delete cascade,
  name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

CREATE TRIGGER update_party_contacts_updated_at BEFORE UPDATE ON party_contacts FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- PASO 9: MARCAS, CATEGORÍAS Y PRODUCTOS (FUSIONADO Y OPTIMIZADO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS brands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(active);
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  code text,
  active boolean default true,
  level integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Procedimiento para calcular niveles iniciales en categorías
DO $$
DECLARE
  r RECORD;
  v_level int;
BEGIN
  FOR r IN SELECT id, parent_id FROM public.categories LOOP
    v_level := 0;
    WITH RECURSIVE anc(cur_id, depth) AS (
      SELECT r.parent_id, 1
      UNION ALL
      SELECT c.parent_id, depth + 1
      FROM public.categories c
      JOIN anc a ON c.id = a.cur_id
      WHERE c.parent_id IS NOT NULL
    )
    SELECT COALESCE(MAX(depth), 0) INTO v_level FROM anc;

    UPDATE public.categories SET level = v_level WHERE id = r.id;
  END LOOP;
END $$
;

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    description TEXT,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    unit_code VARCHAR(10) NOT NULL REFERENCES sunat.cat_06_unidades_medida(code) ON DELETE CASCADE,
    tipo_afectacion VARCHAR(2) NOT NULL REFERENCES sunat.cat_07_afect_igv(code) ON DELETE CASCADE,
    -- Dimensiones físicas
    dimensions JSONB DEFAULT '{}'::jsonb,
    weight_kg quantity DEFAULT 0,

    -- Control de inventario
    is_serialized BOOLEAN DEFAULT false,
    is_batch_controlled BOOLEAN DEFAULT false,
    min_stock quantity DEFAULT 0,
    max_stock quantity DEFAULT 0,
    reorder_point quantity DEFAULT 0,

    -- Estado y metadatos
    active BOOLEAN DEFAULT true,
    tags TEXT[],
    search_vector TSVECTOR,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_products_company_sku UNIQUE (company_id, sku),
    CONSTRAINT chk_stock_levels CHECK (max_stock >= min_stock)
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(company_id, sku);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_unit_code ON products(unit_code);
CREATE INDEX idx_brands_company ON brands(company_id);
CREATE INDEX idx_categories_company ON categories(company_id);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger para actualizar search_vector
CREATE OR REPLACE FUNCTION update_products_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector := to_tsvector('spanish',
        COALESCE(NEW.name, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(NEW.sku, '') || ' ' ||
        COALESCE(array_to_string(NEW.tags, ' '), '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_products_search_vector
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_search_vector();

-- Otras tablas relacionadas con productos (de versión base)
CREATE TABLE IF NOT EXISTS product_images (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  is_primary boolean default false,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS product_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  code_type text not null, -- 'EAN','UPC','SKU_ALT','SERIE','LOTE'
  code_value text not null,
  unique(product_id, code_type, code_value)
);

CREATE TABLE IF NOT EXISTS product_purchase_prices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  supplier_id uuid not null references parties(id) on delete restrict,
  currency_code varchar(3) not null references sunat.cat_02_monedas(code),
  unit_price numeric(18,6) not null,
  observed_at date not null,
  source_doc_type varchar(2) references sunat.cat_10_tipo_documento(code),
  source_doc_series text,
  source_doc_number text,
  created_at timestamptz default now(),
  unique(company_id, product_id, supplier_id, observed_at, source_doc_type, source_doc_series, source_doc_number)
);

-- Ubicaciones de productos en almacén (coordenadas 3D)
CREATE TABLE product_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_zone_id UUID REFERENCES warehouse_zones(id) ON DELETE CASCADE,
    position_x NUMERIC(8,2),
    position_y NUMERIC(8,2),
    position_z NUMERIC(8,2),
    capacity_max NUMERIC(10,2) CHECK (capacity_max >= 0), -- Capacidad máxima en esta ubicación
    stock_actual NUMERIC(10,2) DEFAULT 0 CHECK (stock_actual >= 0),
    es_principal BOOLEAN DEFAULT false, -- Ubicación principal del producto
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PASO 4: TABLAS PARA LOTES Y SERIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    manufacture_date DATE,
    expiry_date DATE,
    qty_initial NUMERIC(18,6) NOT NULL,
    qty_available NUMERIC(18,6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON product_batches FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS product_serials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RETURNED', 'DEFECTIVE')),
    purchase_date DATE,
    sale_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_product_serials_product ON product_serials(product_id);
CREATE TRIGGER update_product_serials_updated_at BEFORE UPDATE ON product_serials FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- PASO 10: LISTAS DE PRECIOS (DE VERSIÓN BASE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_lists (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  currency_code varchar(3) not null references sunat.cat_02_monedas(code),
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, name)
);

CREATE TRIGGER update_price_lists_updated_at BEFORE UPDATE ON price_lists FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS price_list_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  price_list_id uuid not null references price_lists(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  unit_price numeric(18,6) not null,
  valid_from date not null,
  valid_to date,
  unique(price_list_id, product_id, valid_from)
);

-- PASO 5: TABLAS PARA PAGOS Y CUENTAS POR COBRAR/PAGAR
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('SALE', 'PURCHASE')),  -- Venta o Compra
    doc_id UUID NOT NULL,  -- Referencia a sales_docs o purchase_docs
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(18,6) NOT NULL,
    currency_code VARCHAR(3) NOT NULL REFERENCES sunat.cat_02_monedas(code),
    payment_method TEXT NOT NULL,  -- e.g., 'CASH', 'BANK_TRANSFER'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_doc ON payments(doc_type, doc_id);
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- PASO 6: TABLAS PARA DEVOLUCIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('SALE_RETURN', 'PURCHASE_RETURN')),
    original_doc_id UUID NOT NULL,  -- Referencia a sales_docs o purchase_docs
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_doc ON returns(doc_type, original_doc_id);
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_returned NUMERIC(18,6) NOT NULL,
    unit_cost NUMERIC(18,6),  -- Para devoluciones de compra
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- PASO 11: VEHÍCULOS Y CONDUCTORES (DE VERSIÓN BASE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  plate text not null,
  provider_party_id uuid references parties(id) on delete set null, -- terceros
  brand text,
  model text,
  year int,
  own boolean default true,
  capacity_kg numeric(18,6),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, plate)
);

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  party_id uuid not null references parties(id) on delete restrict,
  license_number text not null,
  license_class text,
  valid_until date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, license_number)
);

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Relación many-to-many entre vehículos y conductores
CREATE TABLE vehicle_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assignment_date DATE DEFAULT CURRENT_DATE,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vehicle_id, driver_id)
);

-- PASO 12: DOCUMENTOS DE VENTAS Y COMPRAS (FUSIONADO)
-- ============================================================================
-- Órdenes de venta
CREATE TABLE IF NOT EXISTS sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    currency_code VARCHAR(3) NOT NULL REFERENCES sunat.cat_02_monedas(code),
    exchange_rate NUMERIC(18,6),
    total_amount NUMERIC(18,6) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SHIPPED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_company_status ON sales_orders(company_id, status);
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,6) NOT NULL,
    unit_price NUMERIC(18,6) NOT NULL,
    discount_pct NUMERIC(18,6) DEFAULT 0,
    total_line NUMERIC(18,6) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_pct / 100)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_docs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  customer_id uuid not null references parties(id) on delete restrict,
  doc_type varchar(2) references sunat.cat_10_tipo_documento(code), -- Factura/Boleta, etc.
  series text not null,
  number bigint not null,
  issue_date date not null,
  currency_code varchar(3) not null references sunat.cat_02_monedas(code),
  exchange_rate numeric(18,6),
  op_type varchar(2) references sunat.cat_17_tipo_operacion(code),
  igv_affectation varchar(2) default '10' references sunat.cat_07_afect_igv(code),
  total_ope_gravadas numeric(18,6) default 0,
  total_ope_exoneradas numeric(18,6) default 0,
  total_ope_inafectas numeric(18,6) default 0,
  total_igv numeric(18,6) default 0,
  total_isc numeric(18,6) default 0,
  total_descuentos numeric(18,6) default 0,
  total_otros_cargos numeric(18,6) default 0,
  total numeric(18,6) not null,
  notes text,
  greenter_xml bytea,
  greenter_cdr bytea,
  greenter_hash text,
  greenter_ticket text,
  greenter_status text,
  error_message text,
  observations text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  unique(company_id, doc_type, series, number)
);

CREATE INDEX IF NOT EXISTS idx_sales_unique ON sales_docs(company_id, doc_type, series, number);
CREATE TRIGGER update_sales_docs_updated_at BEFORE UPDATE ON sales_docs FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS sales_doc_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sales_doc_id uuid not null references sales_docs(id) on delete cascade,
  line_number bigint not null default 1,
  product_id uuid not null references products(id),
  description text,
  unit_code varchar(10) not null references sunat.cat_06_unidades_medida(code),
  quantity numeric(18,6) not null,
  unit_price numeric(18,6) not null, -- sin IGV
  discount_pct numeric(18,6) default 0,
  igv_affectation varchar(2) default '10' references sunat.cat_07_afect_igv(code),
  igv_amount numeric(18,6) default 0,
  isc_amount numeric(18,6) default 0,
  total_line numeric(18,6) not null, -- sin IGV
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_sales_doc_items_doc_line ON sales_doc_items (sales_doc_id, line_number);

-- Envíos (afecta stock al enviar mercancía de ventas)
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    sales_doc_id UUID REFERENCES sales_docs(id) ON DELETE SET NULL,
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
    shipment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'SHIPPED' CHECK (status IN ('PARTIAL', 'COMPLETE', 'RETURNED')),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_warehouse_status ON shipments(warehouse_id, status);
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_shipped NUMERIC(18,6) NOT NULL,
    batch_number TEXT,
    serial_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Órdenes de compra (pendientes antes de facturas/recepciones)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    currency_code VARCHAR(3) NOT NULL REFERENCES sunat.cat_02_monedas(code),
    exchange_rate NUMERIC(18,6),
    total_amount NUMERIC(18,6) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_status ON purchase_orders(company_id, status);
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,6) NOT NULL,
    unit_price NUMERIC(18,6) NOT NULL,
    discount_pct NUMERIC(18,6) DEFAULT 0,
    total_line NUMERIC(18,6) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_pct / 100)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recepciones (afecta stock al recibir mercancía de compras)
CREATE TABLE IF NOT EXISTS receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    purchase_doc_id UUID ,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    reception_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('PARTIAL', 'COMPLETE', 'REJECTED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receptions_warehouse_status ON receptions(warehouse_id, status);
CREATE TRIGGER update_receptions_updated_at BEFORE UPDATE ON receptions FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS reception_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reception_id UUID NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_received NUMERIC(18,6) NOT NULL,
    unit_cost NUMERIC(18,6) NOT NULL,
    batch_number TEXT,  -- Opcional para lotes
    serial_number TEXT, -- Opcional para series
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_docs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  supplier_id uuid not null references parties(id) on delete restrict,
  doc_type varchar(2) not null references sunat.cat_10_tipo_documento(code),
  series text not null,
  number text not null,
  issue_date date not null,
  arrival_date date,
  currency_code varchar(3) not null references sunat.cat_02_monedas(code),
  exchange_rate numeric(18,6),
  op_type varchar(2) references sunat.cat_17_tipo_operacion(code),
  total_ope_gravadas numeric(18,6) default 0,
  total_ope_exoneradas numeric(18,6) default 0,
  total_ope_inafectas numeric(18,6) default 0,
  total_igv numeric(18,6) default 0,
  total_isc numeric(18,6) default 0,
  total_descuentos numeric(18,6) default 0,
  total_otros_cargos numeric(18,6) default 0,
  total numeric(18,6) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at TIMESTAMPTZ,
  unique(company_id, doc_type, series, number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_unique ON purchase_docs(company_id, doc_type, series, number);
CREATE TRIGGER update_purchase_docs_updated_at BEFORE UPDATE ON purchase_docs FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS purchase_doc_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  purchase_doc_id uuid not null references purchase_docs(id) on delete cascade,
  product_id uuid not null references products(id),
  description text,
  unit_code varchar(10) not null references sunat.cat_06_unidades_medida(code),
  quantity numeric(18,6) not null,
  unit_cost numeric(18,6) not null, -- sin IGV
  discount_pct numeric(18,6) default 0,
  igv_affectation varchar(2) default '10' references sunat.cat_07_afect_igv(code),
  igv_amount numeric(18,6) default 0,
  isc_amount numeric(18,6) default 0,
  total_line numeric(18,6) not null, -- sin IGV
  created_at timestamptz default now()
);


-- TABLA PARA DETALLES DE IMPUESTOS (POR LÍNEA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type TEXT NOT NULL CHECK (doc_type IN ('SALE_ITEM', 'PURCHASE_ITEM')),  -- Referencia a sales_doc_items o purchase_doc_items
    doc_item_id UUID NOT NULL,
    tax_type VARCHAR(2) NOT NULL REFERENCES sunat.cat_07_afect_igv(code),  -- e.g., IGV, ISC
    rate NUMERIC(5,4) NOT NULL,  -- e.g., 0.18 para 18%
    amount NUMERIC(18,6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_details_doc ON tax_details(doc_type, doc_item_id);
-- Archivos asociados a documentos
CREATE TABLE documents_archivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('COMPRA', 'VENTA', 'RECEPCION')), -- Agregar más si necesario
    document_id UUID NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('PDF', 'XML', 'JPG', 'PNG')),
    file_name VARCHAR(200) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT CHECK (file_size >= 0), -- En bytes
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLAS PARA AJUSTES DE INVENTARIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,  -- e.g., 'MERMA', 'CONTEO FISICO'
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_warehouse ON inventory_adjustments(warehouse_id);
CREATE TRIGGER update_inventory_adjustments_updated_at BEFORE UPDATE ON inventory_adjustments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS adjustment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id UUID NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_adjustment NUMERIC(18,6) NOT NULL,  -- Positivo: entrada, Negativo: salida
    unit_cost NUMERIC(18,6),  -- Para entradas
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 13: GESTIÓN DE INVENTARIOS CON PARTICIONAMIENTO (OPTIMIZADO)
-- ============================================================================

-- Tabla de stock ledger particionada por fecha (versión optimizada)
CREATE TABLE public.stock_ledger (
    id UUID DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL,
    zone_id UUID REFERENCES warehouse_zones(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_date DATE NOT NULL,

    -- Referencias del documento
    ref_doc_type VARCHAR(2),
    ref_doc_series TEXT,
    ref_doc_number TEXT,
    operation_type VARCHAR(2),

    -- Cantidades y costos
    qty_in quantity DEFAULT 0,
    qty_out quantity DEFAULT 0,
    
    -- Costos en moneda original
    original_currency_code VARCHAR(3) REFERENCES sunat.cat_02_monedas(code),
    exchange_rate NUMERIC(18, 6),
    original_unit_cost_in monetary,
    original_total_cost_in monetary,

    -- Costos en moneda base de la compañia
    unit_cost_in monetary,
    total_cost_in monetary,
    unit_cost_out monetary,
    total_cost_out monetary,

    -- Saldos calculados
    balance_qty quantity NOT NULL DEFAULT 0,
    balance_unit_cost monetary,
    balance_total_cost monetary,

    -- Metadatos
    source TEXT,
    source_id UUID,
    batch_id UUID,
    serial_numbers TEXT[],
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (id, movement_date)
) PARTITION BY RANGE (movement_date);

-- Crear particiones para los próximos 24 meses
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    year_month TEXT;
BEGIN
    start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months');

    FOR i IN 0..35 LOOP
        end_date := start_date + INTERVAL '1 month';
        year_month := TO_CHAR(start_date, 'YYYY_MM');
        partition_name := 'stock_ledger_' || year_month;

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS partitions.%I PARTITION OF public.stock_ledger
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        -- Índices específicos por partición
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS idx_%I_product_date
            ON partitions.%I (company_id, product_id, movement_date)',
            partition_name, partition_name
        );

        start_date := end_date;
    END LOOP;
END $$
;

CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_date ON stock_ledger(company_id, product_id, movement_date);

-- Tabla de stock agregado (de versión base)
CREATE TABLE IF NOT EXISTS warehouse_stock (
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  balance_qty numeric(18,6) not null default 0,
  primary key (warehouse_id, product_id)
);

-- PASO 14: TRANSFERENCIAS DE STOCK (DE VERSIÓN BASE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  from_warehouse_id uuid not null references warehouses(id),
  to_warehouse_id uuid not null references warehouses(id),
  transfer_date date not null,
  reason varchar(2) references sunat.cat_20_motivo_traslado(code),
  modality varchar(2) references sunat.cat_18_modalidad_traslado(code),
  vehicle_id uuid references vehicles(id),
  driver_id uuid references drivers(id),
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  transfer_id uuid not null references stock_transfers(id) on delete cascade,
  product_id uuid not null references products(id),
  unit_code varchar(10) not null references sunat.cat_06_unidades_medida(code),
  quantity numeric(18,6) not null
);

-- Crear tabla para tasas de cambio
CREATE TABLE public.exchange_rates (
    id SERIAL PRIMARY KEY,
    /* company_id UUID NOT NULL references companies(id), */
    rate_date DATE NOT NULL,
    from_currency_code CHAR(3) NOT NULL,
    to_currency_code CHAR(3) NOT NULL,
    rate DECIMAL(10, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricción para evitar tasas de cambio duplicadas para la misma fecha y monedas
    CONSTRAINT unique_exchange_rate UNIQUE (rate_date, from_currency_code, to_currency_code),
    
    -- Verificar que las monedas sean diferentes
    CONSTRAINT different_currencies CHECK (from_currency_code <> to_currency_code),
    
    -- Verificar que la tasa sea positiva
    CONSTRAINT positive_rate CHECK (rate > 0)
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX idx_exchange_rates_date ON public.exchange_rates(rate_date);
CREATE INDEX idx_exchange_rates_currency_pair ON public.exchange_rates(from_currency_code, to_currency_code);

-- Opcional: Crear un trigger para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exchange_rates_updated_at
    BEFORE UPDATE ON public.exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- PASO 15: FUNCIONES OPTIMIZADAS PARA CÁLCULO DE INVENTARIO (FUSIONADO)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_inventory_balance(
    p_company_id UUID,
    p_product_id UUID,
    p_warehouse_id UUID,
    p_movement_date DATE,
    p_qty_in NUMERIC DEFAULT 0,
    p_qty_out NUMERIC DEFAULT 0,
    p_unit_cost_in NUMERIC DEFAULT NULL,
    p_valuation_method TEXT DEFAULT 'PROMEDIO_MOVIL'
)
RETURNS TABLE(
    new_balance_qty NUMERIC,
    new_balance_unit_cost NUMERIC,
    new_balance_total_cost NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prev_qty NUMERIC := 0;
    prev_total_cost NUMERIC := 0;
    prev_unit_cost NUMERIC := 0;
    calc_qty NUMERIC;
    calc_total_cost NUMERIC;
    calc_unit_cost NUMERIC;
BEGIN
    -- Obtener saldo anterior (con FOR UPDATE para evitar race conditions)
    SELECT COALESCE(sl.balance_qty, 0),
           COALESCE(sl.balance_total_cost, 0),
           COALESCE(sl.balance_unit_cost, 0)
    INTO prev_qty, prev_total_cost, prev_unit_cost
    FROM public.stock_ledger sl
    WHERE sl.company_id = p_company_id
      AND sl.product_id = p_product_id
      AND sl.warehouse_id = p_warehouse_id
      AND sl.movement_date <= p_movement_date
    ORDER BY sl.movement_date DESC, sl.created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- Calcular nuevos valores según método de valuación
    CASE p_valuation_method
        WHEN 'PROMEDIO_MOVIL' THEN
            IF p_qty_in > 0 THEN
                calc_qty := prev_qty + p_qty_in;
                calc_total_cost := prev_total_cost + (p_qty_in * COALESCE(p_unit_cost_in, prev_unit_cost));
                calc_unit_cost := CASE WHEN calc_qty > 0 THEN calc_total_cost / calc_qty ELSE 0 END;
            ELSE
                calc_qty := prev_qty - p_qty_out;
                calc_total_cost := prev_total_cost - (p_qty_out * prev_unit_cost);
                calc_unit_cost := prev_unit_cost;
            END IF;

        WHEN 'FIFO' THEN
            -- Implementación simplificada de FIFO
            calc_qty := prev_qty + p_qty_in - p_qty_out;
            calc_total_cost := CASE
                WHEN p_qty_in > 0 THEN prev_total_cost + (p_qty_in * p_unit_cost_in)
                ELSE prev_total_cost - (p_qty_out * prev_unit_cost)
            END;
            calc_unit_cost := CASE WHEN calc_qty > 0 THEN calc_total_cost / calc_qty ELSE 0 END;
    END CASE;

    -- Validar valores no negativos
    calc_qty := GREATEST(calc_qty, 0);
    calc_total_cost := GREATEST(calc_total_cost, 0);
    calc_unit_cost := CASE WHEN calc_qty > 0 THEN calc_total_cost / calc_qty ELSE 0 END;

    -- Retornar resultados
    RETURN QUERY SELECT calc_qty, calc_unit_cost, calc_total_cost;
END;
$$;

CREATE OR REPLACE FUNCTION compute_stock_ledger_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  prev_qty numeric(18,6) := 0;
  prev_total numeric(18,6) := 0;
  prev_unit numeric(18,6) := 0;
  valuation_method text;
BEGIN
  SELECT c.valuation_method INTO valuation_method
  FROM companies c
  WHERE c.id = NEW.company_id;

  SELECT COALESCE(balance_qty, 0), COALESCE(balance_total_cost, 0), COALESCE(balance_unit_cost, 0)
  INTO prev_qty, prev_total, prev_unit
  FROM stock_ledger
  WHERE company_id = NEW.company_id
    AND warehouse_id = NEW.warehouse_id
    AND product_id = NEW.product_id
    AND (movement_date < NEW.movement_date OR (movement_date = NEW.movement_date AND created_at < NEW.created_at))
  ORDER BY movement_date DESC, created_at DESC
  LIMIT 1;

  IF NEW.qty_in > 0 AND NEW.total_cost_in IS NULL THEN
    NEW.total_cost_in := NEW.qty_in * COALESCE(NEW.unit_cost_in, 0);
  END IF;
  IF NEW.qty_out > 0 AND NEW.total_cost_out IS NULL THEN
    NEW.unit_cost_out := prev_unit;
    NEW.total_cost_out := NEW.qty_out * NEW.unit_cost_out;
  END IF;

  IF valuation_method = 'PROMEDIO_MOVIL' THEN
    IF NEW.qty_in > 0 THEN
      NEW.balance_qty := prev_qty + NEW.qty_in;
      NEW.balance_total_cost := prev_total + NEW.total_cost_in;
      IF NEW.balance_qty > 0 THEN
        NEW.balance_unit_cost := NEW.balance_total_cost / NEW.balance_qty;
      ELSE
        NEW.balance_unit_cost := 0;
      END IF;
    ELSIF NEW.qty_out > 0 THEN
      NEW.balance_qty := prev_qty - NEW.qty_out;
      NEW.balance_total_cost := prev_total - NEW.total_cost_out;
      NEW.balance_unit_cost := CASE WHEN NEW.balance_qty > 0 THEN NEW.balance_total_cost / NEW.balance_qty ELSE 0 END;
    ELSE
      NEW.balance_qty := prev_qty;
      NEW.balance_total_cost := prev_total;
      NEW.balance_unit_cost := prev_unit;
    END IF;
  ELSIF valuation_method = 'FIFO' THEN
    NEW.balance_qty := prev_qty + NEW.qty_in - NEW.qty_out;
    NEW.balance_total_cost := prev_total + NEW.total_cost_in - NEW.total_cost_out;
    NEW.balance_unit_cost := CASE WHEN NEW.balance_qty > 0 THEN NEW.balance_total_cost / NEW.balance_qty ELSE 0 END;
  END IF;

  NEW.balance_qty := COALESCE(NEW.balance_qty, 0);
  NEW.balance_total_cost := COALESCE(NEW.balance_total_cost, 0);
  NEW.balance_unit_cost := COALESCE(NEW.balance_unit_cost, 0);

  RETURN NEW;
END;
$$;


CREATE TRIGGER trigger_compute_stock_ledger_balances
BEFORE INSERT ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION compute_stock_ledger_balances();

CREATE OR REPLACE FUNCTION update_warehouse_stock_from_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_warehouse_stock_balance(
    NEW.warehouse_id,
    NEW.product_id,
    NEW.balance_qty
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_warehouse_stock
AFTER INSERT ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION update_warehouse_stock_from_ledger();

CREATE OR REPLACE FUNCTION sync_warehouse_stock(p_company uuid, p_warehouse uuid, p_product uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_qty numeric(18,6);
BEGIN
  SELECT COALESCE(SUM(qty_in - qty_out),0) INTO v_qty
  FROM stock_ledger
  WHERE company_id = p_company AND warehouse_id = p_warehouse AND product_id = p_product;

  INSERT INTO warehouse_stock(warehouse_id, product_id, balance_qty)
  VALUES (p_warehouse, p_product, v_qty)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE SET balance_qty = EXCLUDED.balance_qty;
END$$;

-- Controla la configuración de series por empresa, tipo de documento y almacén (opcional).
CREATE TABLE public.document_series (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_type_code VARCHAR(4) NOT NULL, -- Ej: 01 = Factura, 03 = Boleta
    series VARCHAR(4) NOT NULL, -- Ej: F001, B001
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (company_id, document_type_code, series)
);

-- Registra el último número usado para cada combinación de empresa + tipo de documento + serie.

CREATE TABLE public.document_counters (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_type_code VARCHAR(4) NOT NULL,
    series VARCHAR(4) NOT NULL,
    last_number BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (company_id, document_type_code, series)
);

-- Esto evita conflictos de concurrencia en ventas o facturación electrónica:
CREATE OR REPLACE FUNCTION public.next_document_number(
    p_company_id UUID,
    p_document_type_code VARCHAR,
    p_series VARCHAR
)
RETURNS BIGINT AS $$
DECLARE
    new_number BIGINT;
BEGIN
    UPDATE public.document_counters
    SET last_number = last_number + 1,
        updated_at = now()
    WHERE company_id = p_company_id
      AND document_type_code = p_document_type_code
      AND series = p_series
    RETURNING last_number INTO new_number;

    IF new_number IS NULL THEN
        INSERT INTO public.document_counters(company_id, document_type_code, series, last_number)
        VALUES (p_company_id, p_document_type_code, p_series, 1)
        RETURNING last_number INTO new_number;
    END IF;

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- PASO 16: VISTAS MATERIALIZADAS PARA REPORTES (FUSIONADO Y OPTIMIZADO)
-- ============================================================================

CREATE MATERIALIZED VIEW public.mv_warehouse_stock AS
WITH latest_movements AS (
    SELECT DISTINCT ON (company_id, warehouse_id, product_id)
        company_id,
        warehouse_id,
        product_id,
        balance_qty,
        balance_unit_cost,
        balance_total_cost,
        movement_date,
        created_at
    FROM public.stock_ledger
    ORDER BY company_id, warehouse_id, product_id, movement_date DESC, created_at DESC
)
SELECT 
    lm.company_id,
    lm.warehouse_id,
    w.name as warehouse_name,
    lm.product_id,
    p.sku,
    p.name as product_name,
    p.unit_code,
    lm.balance_qty as current_stock,
    lm.balance_unit_cost as unit_cost,
    lm.balance_total_cost as total_value,
    p.min_stock,
    p.max_stock,
    CASE 
        WHEN lm.balance_qty <= p.min_stock THEN 'LOW_STOCK'
        WHEN lm.balance_qty >= p.max_stock THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END as stock_status,
    lm.movement_date as last_movement_date
FROM latest_movements lm
JOIN public.products p ON p.id = lm.product_id
JOIN public.warehouses w ON w.id = lm.warehouse_id
WHERE lm.balance_qty > 0 OR p.min_stock > 0;

CREATE UNIQUE INDEX ON public.mv_warehouse_stock (company_id, warehouse_id, product_id);

CREATE MATERIALIZED VIEW public.mv_sales_analysis AS
WITH monthly_sales AS (
    SELECT 
        sd.company_id,
        DATE_TRUNC('month', sd.issue_date) as month_year,
        sd.currency_code,
        COUNT(*) as total_documents,
        SUM(sd.total) as total_sales,
        SUM(sd.total_igv) as total_tax,
        AVG(sd.total) as avg_ticket,
        COUNT(DISTINCT sd.customer_id) as unique_customers
    FROM public.sales_docs sd
    WHERE sd.deleted_at IS NULL
    GROUP BY sd.company_id, DATE_TRUNC('month', sd.issue_date), sd.currency_code
)
SELECT 
    ms.*
    , LAG(ms.total_sales, 1) OVER (
        PARTITION BY ms.company_id, ms.currency_code 
        ORDER BY ms.month_year
    ) as previous_month_sales
    , CASE 
        WHEN LAG(ms.total_sales, 1) OVER (
            PARTITION BY ms.company_id, ms.currency_code 
            ORDER BY ms.month_year
        ) > 0 THEN 
            ROUND(((ms.total_sales - LAG(ms.total_sales, 1) OVER (
                PARTITION BY ms.company_id, ms.currency_code 
                ORDER BY ms.month_year
            )) / LAG(ms.total_sales, 1) OVER (
                PARTITION BY ms.company_id, ms.currency_code 
                ORDER BY ms.month_year
            ) * 100)::NUMERIC, 2)
        ELSE NULL
    END as growth_percentage
FROM monthly_sales ms;

CREATE UNIQUE INDEX ON public.mv_sales_analysis (company_id, month_year, currency_code);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_kardex_mensual AS
WITH per_month AS (
  SELECT 
    sl.company_id,
    sl.product_id,
    DATE_TRUNC('month', sl.movement_date) AS periodo,
    SUM(sl.qty_in) AS total_entradas,
    SUM(sl.qty_out) AS total_salidas,
    SUM(sl.total_cost_in) AS total_costo_entradas,
    SUM(sl.total_cost_out) AS total_costo_salidas
  FROM stock_ledger sl
  GROUP BY sl.company_id, sl.product_id, DATE_TRUNC('month', sl.movement_date)
)
SELECT 
  pm.company_id,
  pm.product_id,
  p.sku,
  p.name AS product_name,
  p.unit_code,
  pm.periodo,
  pm.total_entradas,
  pm.total_salidas,
  pm.total_costo_entradas,
  pm.total_costo_salidas,
  last_rec.balance_qty AS saldo_final_cantidad,
  last_rec.balance_total_cost AS saldo_final_costo
FROM per_month pm
JOIN products p ON p.id = pm.product_id
LEFT JOIN LATERAL (
  SELECT sl2.balance_qty, sl2.balance_total_cost
  FROM stock_ledger sl2
  WHERE sl2.company_id = pm.company_id
    AND sl2.product_id = pm.product_id
    AND DATE_TRUNC('month', sl2.movement_date) = pm.periodo
  ORDER BY sl2.movement_date DESC, sl2.created_at DESC
  LIMIT 1
) last_rec ON TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_kardex_mensual_unique 
  ON mv_kardex_mensual (company_id, product_id, periodo);

-- PASO 16.2: VISTAS DE ANÁLISIS FINANCIERO AVANZADO (REVALUACIÓN Y SIMULACIÓN)
-- ============================================================================

-- Vista 1: Revaluación de Costo de Inventario
-- Propósito: Analizar el impacto del tipo de cambio actual en el costo del stock disponible.
-- Muestra una ganancia o pérdida "no realizada" basada en la fluctuación de la moneda.
CREATE MATERIALIZED VIEW public.mv_inventory_revaluation AS
WITH latest_exchange_rate AS (
    -- Obtenemos la tasa de cambio más reciente para el dólar (o la moneda de compra principal)
    SELECT rate
    FROM public.exchange_rates
    WHERE from_currency_code = 'USD' AND to_currency_code = 'PEN' -- Asumiendo PEN como base
    ORDER BY rate_date DESC
    LIMIT 1
),
product_avg_foreign_cost AS (
    -- Calculamos el costo promedio de compra EN MONEDA EXTRANJERA para cada producto
    SELECT
        product_id,
        -- Suma de todos los costos en USD / Suma de todas las cantidades compradas
        SUM(original_total_cost_in) / SUM(qty_in) as avg_cost_usd
    FROM public.stock_ledger
    WHERE qty_in > 0 AND original_currency_code = 'USD' AND original_total_cost_in IS NOT NULL
    GROUP BY product_id
)
SELECT
    ws.company_id,
    ws.product_id,
    p.sku,
    p.name as product_name,
    ws.current_stock,
    pafc.avg_cost_usd,
    ws.unit_cost as accounting_avg_cost_pen, -- Costo promedio contable en PEN
    ler.rate as current_exchange_rate,
    -- Calculamos el costo revaluado: Costo Promedio en USD * Tasa de Cambio Actual
    (pafc.avg_cost_usd * ler.rate) as revalued_cost_pen,
    -- Diferencia unitaria
    (pafc.avg_cost_usd * ler.rate) - ws.unit_cost as unit_cost_difference,
    -- Ganancia o pérdida total no realizada en el stock existente
    ( (pafc.avg_cost_usd * ler.rate) - ws.unit_cost ) * ws.current_stock as total_unrealized_gain_loss
FROM public.mv_warehouse_stock ws
JOIN public.products p ON ws.product_id = p.id
JOIN product_avg_foreign_cost pafc ON ws.product_id = pafc.product_id
CROSS JOIN latest_exchange_rate ler
WHERE ws.current_stock > 0;

CREATE UNIQUE INDEX ON public.mv_inventory_revaluation (company_id, product_id);


-- Vista 2: Simulación de Rentabilidad de Venta
-- Propósito: Comparar la ganancia contable con una ganancia simulada, ajustando el costo
-- del producto al tipo de cambio del día de la venta.
CREATE MATERIALIZED VIEW public.mv_sales_profit_simulation AS
WITH product_avg_foreign_cost AS (
    -- CTE duplicado aquí para que la vista sea autocontenida.
    -- En un escenario real, podría ser una función o una vista no materializada.
    SELECT
        product_id,
        SUM(original_total_cost_in) / SUM(qty_in) as avg_cost_usd
    FROM public.stock_ledger
    WHERE qty_in > 0 AND original_currency_code = 'USD' AND original_total_cost_in IS NOT NULL
    GROUP BY product_id
),
sales_costs AS (
    -- Por cada línea de venta, necesitamos obtener su costo de salida del ledger.
    -- NOTA: Esta unión es una simplificación. Una venta compleja podría tener múltiples
    -- salidas de stock si el producto se despacha de lotes diferentes.
    SELECT
        sdi.id as sales_doc_item_id,
        sl.unit_cost_out as accounting_cost_pen -- Costo de salida según el promedio móvil
    FROM public.sales_doc_items sdi
    JOIN public.sales_docs sd ON sdi.sales_doc_id = sd.id
    -- Buscamos el movimiento de salida en el ledger que corresponde a esta venta
    JOIN public.stock_ledger sl ON
        sl.company_id = sdi.company_id AND
        sl.product_id = sdi.product_id AND
        sl.ref_doc_type = sd.doc_type AND
        sl.ref_doc_series = sd.series AND
        sl.ref_doc_number = sd.number::text AND
        sl.qty_out > 0
    LIMIT 1 -- Se asume una salida por item de venta para esta simulación.
)
SELECT
    sdi.id as sale_item_id,
    sd.company_id,
    sd.issue_date,
    sdi.product_id,
    p.name as product_name,
    sdi.quantity,
    -- 1. Ingreso por la venta (en PEN)
    (sdi.unit_price * COALESCE(sd.exchange_rate, 1)) as revenue_per_unit_pen,
    -- 2. Costo Contable (el que usa el sistema)
    sc.accounting_cost_pen,
    -- 3. Ganancia Contable
    (sdi.unit_price * COALESCE(sd.exchange_rate, 1)) - sc.accounting_cost_pen as accounting_profit_per_unit,
    -- 4. Costo Simulado (revaluado al día de la venta)
    (
        SELECT pafc.avg_cost_usd * er.rate
        FROM product_avg_foreign_cost pafc
        JOIN public.exchange_rates er ON er.rate_date = sd.issue_date AND er.from_currency_code = 'USD'
        WHERE pafc.product_id = sdi.product_id
        LIMIT 1
    ) as simulated_cost_pen,
    -- 5. Ganancia Simulada
    (
        (
            sdi.unit_price * COALESCE(sd.exchange_rate, 1)
        ) -
        (
            SELECT pafc.avg_cost_usd * er.rate
            FROM product_avg_foreign_cost pafc
            JOIN public.exchange_rates er ON er.rate_date = sd.issue_date AND er.from_currency_code = 'USD'
            WHERE pafc.product_id = sdi.product_id
            LIMIT 1
        )
    ) as simulated_profit_per_unit,
    -- 6. Diferencia en la ganancia
    (
        (
            (
                sdi.unit_price * COALESCE(sd.exchange_rate, 1)
            ) -
            (
                SELECT pafc.avg_cost_usd * er.rate
                FROM product_avg_foreign_cost pafc
                JOIN public.exchange_rates er ON er.rate_date = sd.issue_date AND er.from_currency_code = 'USD'
                WHERE pafc.product_id = sdi.product_id
                LIMIT 1
            )
        )
        - ( (sdi.unit_price * COALESCE(sd.exchange_rate, 1)) - sc.accounting_cost_pen )
    ) as profit_difference
FROM public.sales_doc_items sdi
JOIN public.sales_docs sd ON sdi.sales_doc_id = sd.id
JOIN public.products p ON sdi.product_id = p.id
LEFT JOIN sales_costs sc ON sdi.id = sc.sales_doc_item_id -- LEFT JOIN por si no se encuentra costo
WHERE sd.deleted_at IS NULL;

CREATE UNIQUE INDEX ON public.mv_sales_profit_simulation (sale_item_id);


-- PASO 17: FUNCIONES PARA REFRESH DE VISTAS MATERIALIZADAS
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_all_materialized_views(
    concurrent_refresh BOOLEAN DEFAULT true
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    view_name TEXT;
    refresh_results TEXT[] := '{}';
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
BEGIN
    FOR view_name IN 
        SELECT matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
        ORDER BY matviewname
    LOOP
        start_time := NOW();

        BEGIN 
            IF concurrent_refresh THEN
                EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY public.%I', view_name);
            ELSE
                EXECUTE format('REFRESH MATERIALIZED VIEW public.%I', view_name);
            END IF;

            end_time := NOW();
            refresh_results := refresh_results || 
                format('%s: SUCCESS (%s)', view_name, end_time - start_time);

        EXCEPTION WHEN OTHERS THEN
            refresh_results := refresh_results || 
                format('%s: ERROR - %s', view_name, SQLERRM);
        END;
    END LOOP;

    RETURN refresh_results;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_kardex_mensual()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kardex_mensual;
END;
$$;

-- VISTAS ADICIONALES PARA REPORTES DE INVENTARIO
-- Vistas SUNAT (12.1 y 13.1)
create or replace view v_sunat_inventory_header as
select
  c.legal_name as denominacion_libro,
  to_char(date_trunc('month', sl.movement_date), 'YYYY-MM') as periodo,
  c.ruc as ruc,
  c.legal_name as razon_social,
  coalesce(b.name, w.name) as establecimiento,
  p.sku as codigo_existencia,
  p.name as descripcion_existencia,
  p.unit_code as unidad_medida,
  c.valuation_method as metodo_valuacion
from stock_ledger sl
join companies c on c.id = sl.company_id
left join warehouses w on w.id = sl.warehouse_id
left join branches b on b.id = w.branch_id
join products p on p.id = sl.product_id
group by 1,2,3,4,5,6,7,8,9;

create or replace view v_sunat_formato_12_1 as
select
  sl.company_id,
  sl.product_id,
  sl.movement_date as fecha_emision,
  sl.ref_doc_type as tipo_doc,
  sl.ref_doc_series as serie_doc,
  sl.ref_doc_number as numero_doc,
  sl.operation_type as tipo_operacion,
  sl.qty_in as entradas_unid,
  sl.qty_out as salidas_unid,
  sl.balance_qty as saldo_final_unid
from stock_ledger sl
order by sl.product_id, sl.movement_date, sl.created_at;

create or replace view v_sunat_formato_13_1 as
select
  sl.company_id,
  sl.product_id,
  sl.movement_date as fecha_emision,
  sl.ref_doc_type as tipo_doc,
  sl.ref_doc_series as serie_doc,
  sl.ref_doc_number as numero_doc,
  sl.operation_type as tipo_operacion,
  sl.qty_in as entradas_cantidad,
  sl.unit_cost_in as entradas_costo_unit,
  sl.total_cost_in as entradas_costo_total,
  sl.qty_out as salidas_cantidad,
  sl.unit_cost_out as salidas_costo_unit,
  sl.total_cost_out as salidas_costo_total,
  sl.balance_qty as saldo_cantidad,
  sl.balance_unit_cost as saldo_costo_unit,
  sl.balance_total_cost as saldo_costo_total
from stock_ledger sl
order by sl.product_id, sl.movement_date, sl.created_at;

create or replace view v_sunat_formato_13_1_resumen_diario as
select company_id, product_id, movement_date,
      sum(qty_in) entradas_cantidad,
      sum(total_cost_in) entradas_costo_total,
      sum(qty_out) salidas_cantidad,
      sum(total_cost_out) salidas_costo_total
from stock_ledger
group by company_id, product_id, movement_date;

-- PASO 18: CONFIGURACIÓN DE SEGURIDAD RLS (FUSIONADO)
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_purchase_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_doc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_doc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para companies
CREATE POLICY company_access_policy ON public.companies
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_companies uc 
            WHERE uc.company_id = companies.id 
              AND uc.user_id = auth.uid()
              AND uc.is_active = true
              AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
        )
    );

-- Política RLS para productos
CREATE POLICY products_company_policy ON public.products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_companies uc 
            WHERE uc.company_id = products.company_id 
              AND uc.user_id = auth.uid()
              AND uc.is_active = true
        )
    );

-- PASO 19: FUNCIONES DE AUDITORÍA (VERSIÓN OPTIMIZADA)
-- ============================================================================

CREATE TABLE audit.activity_log (
    id BIGSERIAL ,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    company_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at) 
) PARTITION BY RANGE (created_at);

CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit.activity_log (
        table_name, record_id, action, old_values, new_values,
        user_id, company_id, created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) END,
        auth.uid(),
        COALESCE(NEW.company_id, OLD.company_id),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- PASO 20: JOBS Y MANTENIMIENTO AUTOMATIZADO (VERSIÓN OPTIMIZADA)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS maintenance;

CREATE OR REPLACE FUNCTION maintenance.cleanup_old_partitions(
    retention_months INTEGER DEFAULT 24
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    partition_name TEXT;
    cutoff_date DATE;
    dropped_partitions TEXT[] := '{}';
BEGIN
    cutoff_date := CURRENT_DATE - (retention_months || ' months')::INTERVAL;

    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE schemaname = 'partitions'
          AND tablename LIKE 'stock_ledger_%'
          AND tablename < 'stock_ledger_' || TO_CHAR(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %s', partition_name);
        dropped_partitions := dropped_partitions || partition_name;
    END LOOP;

    RETURN dropped_partitions;
END;
$$;

CREATE OR REPLACE FUNCTION maintenance.auto_analyze_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    table_size BIGINT;
    last_analyze TIMESTAMPTZ;
BEGIN
    SELECT 
        pg_total_relation_size(TG_RELID),
        last_analyze 
    INTO table_size, last_analyze 
    FROM pg_stat_user_tables 
    WHERE relid = TG_RELID;

    IF table_size > 100 * 1024 * 1024 AND -- 100MB
       (last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '24 hours') THEN

        PERFORM pg_stat_reset_single_table_counters(TG_RELID);
        EXECUTE format('ANALYZE %I.%I', TG_TABLE_SCHEMA, TG_TABLE_NAME);
    END IF;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION maintenance.schedule_daily_maintenance()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_result TEXT;
BEGIN
    PERFORM refresh_all_materialized_views(true);

    DELETE FROM audit.activity_log 
    WHERE created_at < CURRENT_DATE - INTERVAL '2 years';

    job_result := (
        SELECT string_agg(
            format('%s: %s (%s)', check_name, status, details),
            E'\n'
        )
        FROM maintenance.validate_data_integrity()
    );

    ANALYZE public.stock_ledger;
    ANALYZE public.sales_docs;
    ANALYZE public.products;

    RETURN 'Mantenimiento diario completado: ' || E'\n' || job_result;
END;
$$;

CREATE OR REPLACE FUNCTION maintenance.validate_data_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT,
    affected_records BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    WITH negative_stock AS (
        SELECT COUNT(*) as cnt 
        FROM public.mv_warehouse_stock 
        WHERE current_stock < 0
    )
    SELECT 
        'Negative Stock Check'::TEXT, 
        CASE WHEN cnt = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT, 
        CASE WHEN cnt = 0 THEN 'No negative stock found' 
             ELSE format('%s products with negative stock', cnt) END::TEXT,
        cnt
    FROM negative_stock;

    RETURN QUERY 
    WITH docs_without_items AS (
        SELECT COUNT(*) as cnt
        FROM public.sales_docs sd
        LEFT JOIN public.sales_doc_items sdi ON sdi.sales_doc_id = sd.id
        WHERE sdi.id IS NULL
    )
    SELECT 
        'Documents Without Items'::TEXT,
        CASE WHEN cnt = 0 THEN 'PASS' ELSE 'WARNING' END::TEXT,
        CASE WHEN cnt = 0 THEN 'All documents have items' 
             ELSE format('%s documents without items', cnt) END::TEXT,
        cnt
    FROM docs_without_items;

    RETURN QUERY 
    WITH orphan_products AS (
        SELECT COUNT(*) as cnt
        FROM public.products p
        LEFT JOIN public.stock_ledger sl ON sl.product_id = p.id
        WHERE sl.id IS NULL AND p.active = true
    )
    SELECT 
        'Orphan Products Check'::TEXT,
        CASE WHEN cnt = 0 THEN 'PASS' ELSE 'INFO' END::TEXT,
        CASE WHEN cnt = 0 THEN 'No orphan products found' 
             ELSE format('%s active products without movements', cnt) END::TEXT,
        cnt
    FROM orphan_products;

    RETURN QUERY 
    WITH balance_inconsistency AS (
        SELECT COUNT(*) as cnt
        FROM public.stock_ledger sl1
        WHERE EXISTS (
            SELECT 1 FROM public.stock_ledger sl2
            WHERE sl2.company_id = sl1.company_id
              AND sl2.product_id = sl1.product_id
              AND sl2.warehouse_id = sl1.warehouse_id
              AND sl2.movement_date > sl1.movement_date
              AND sl2.balance_qty != sl1.balance_qty + 
                  COALESCE((
                      SELECT SUM(qty_in - qty_out)
                      FROM public.stock_ledger sl3
                      WHERE sl3.company_id = sl1.company_id
                        AND sl3.product_id = sl1.product_id
                        AND sl3.warehouse_id = sl1.warehouse_id
                        AND sl3.movement_date > sl1.movement_date
                        AND sl3.movement_date <= sl2.movement_date
                  ), 0)
        )
    )
    SELECT 
        'Balance Consistency Check'::TEXT,
        CASE WHEN cnt = 0 THEN 'PASS' ELSE 'CRITICAL' END::TEXT,
        CASE WHEN cnt = 0 THEN 'Balance calculations are consistent' 
             ELSE format('%s inconsistent balance records found', cnt) END::TEXT,
        cnt
    FROM balance_inconsistency;
END;
$$;

-- PASO 21: FUNCIONES DE APLICACIÓN Y HELPERS (FUSIONADO)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app_functions;

CREATE OR REPLACE FUNCTION app_functions.user_has_permission(
    p_user_id UUID,
    p_company_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_companies uc
        JOIN public.roles r ON r.id = uc.role_id
        WHERE uc.user_id = p_user_id
          AND uc.company_id = p_company_id
          AND uc.is_active = true
          AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
          AND (
              r.permissions ? '*'
              OR r.permissions ? p_permission
              OR uc.permissions_override ? p_permission
          )
    );
$$;

CREATE OR REPLACE FUNCTION app_functions.get_user_companies(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE(
    company_id UUID,
    company_name TEXT,
    ruc TEXT,
    role_name TEXT,
    permissions JSONB,
    is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.legal_name,
        c.ruc,
        r.name,
        r.permissions,
        uc.is_active
    FROM public.user_companies uc
    JOIN public.companies c ON c.id = uc.company_id
    JOIN public.roles r ON r.id = uc.role_id
    WHERE uc.user_id = p_user_id
      AND uc.is_active = true
      AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
    ORDER BY c.legal_name;
$$;

CREATE OR REPLACE FUNCTION validate_electronic_billing_config(
  p_company_id UUID,
  p_sol_user TEXT,
  p_cert_path TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Lógica de validación (simplificada)
  RETURN p_sol_user IS NOT NULL AND p_cert_path IS NOT NULL;
END;
$$;

-- Contenido de C:\Proyectos\sistema-erp-inventario\supabase\migrations\20250823100203_add_sunat_rpc_functions.sql
-- ============================================================================
-- RPC FUNCTIONS FOR SUNAT CATALOGS ACCESS
-- ============================================================================

-- Function to get unit measures from sunat schema
CREATE OR REPLACE FUNCTION get_unit_measures()
RETURNS TABLE (
    code VARCHAR(10),
    descripcion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT u.code, u.descripcion
    FROM sunat.cat_06_unidades_medida u
    ORDER BY u.descripcion;
END;
$$;

-- Function to get tax affectations from sunat schema
CREATE OR REPLACE FUNCTION get_tax_affectations()
RETURNS TABLE (
    code VARCHAR(2),
    descripcion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT t.code, t.descripcion
    FROM sunat.cat_07_afect_igv t
    ORDER BY t.code;
END;
$$;

-- Function to get document types from sunat schema
CREATE OR REPLACE FUNCTION get_document_types()
RETURNS TABLE (
    code VARCHAR(2),
    descripcion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT d.code, d.descripcion
    FROM sunat.cat_10_tipo_documento d
    ORDER BY d.code;
END;
$$;

-- Function to get currencies from sunat schema
CREATE OR REPLACE FUNCTION get_currencies()
RETURNS TABLE (
    code VARCHAR(3),
    descripcion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT c.code, c.descripcion
    FROM sunat.cat_02_monedas c
    ORDER BY c.descripcion;
END;
$$;

-- Function to get identity document types from sunat schema
CREATE OR REPLACE FUNCTION get_identity_document_types()
RETURNS TABLE (
    code VARCHAR(1),
    descripcion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY 
    SELECT i.code, i.descripcion
    FROM sunat.cat_06_doc_identidad i
    ORDER BY i.code;
END;
$$;

-- Function to get ubigeo data from sunat schema
CREATE OR REPLACE FUNCTION get_ubigeo(search_term TEXT DEFAULT NULL)
RETURNS TABLE (
    code VARCHAR(6),
    departamento TEXT,
    provincia TEXT,
    distrito TEXT,
    full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.code,
        u.departamento,
        u.provincia,
        u.distrito,
        CONCAT(u.departamento, ' - ', u.provincia, ' - ', u.distrito) as full_name
    FROM sunat.ubigeo u
    WHERE search_term IS NULL 
       OR u.departamento ILIKE '%' || search_term || '%'
       OR u.provincia ILIKE '%' || search_term || '%'
       OR u.distrito ILIKE '%' || search_term || '%'
    ORDER BY u.departamento, u.provincia, u.distrito
    LIMIT 100;
END;
$$;

-- Contenido de C:\Proyectos\sistema-erp-inventario\supabase\migrations\20250823122561_notifications_system.sql
-- Crear tabla de notificaciones para el sistema ERP
-- Esta tabla manejará notificaciones para diferentes operaciones del sistema

-- Drop the type-dependent functions
DROP FUNCTION IF EXISTS create_notification;
DROP FUNCTION IF EXISTS mark_notification_as_read;
DROP FUNCTION IF EXISTS get_unread_notifications_count;
DROP FUNCTION IF EXISTS cleanup_expired_notifications;

-- Now safely drop the types
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;

-- Tipos de notificaciones que el sistema puede generar
CREATE TYPE notification_type AS ENUM (
  'sale_created',           -- Venta creada
  'sale_approved',          -- Venta aprobada
  'sale_rejected',          -- Venta rechazada
  'sale_invoiced',          -- Venta facturada
  'purchase_created',       -- Compra creada
  'purchase_received',      -- Compra recibida
  'stock_low',              -- Stock bajo
  'stock_out',              -- Sin stock
  'stock_transfer',         -- Transferencia de stock
  'price_change',           -- Cambio de precio
  'user_assigned',          -- Usuario asignado a empresa
  'user_role_changed',      -- Rol de usuario cambiado
  'document_expiry',        -- Documento próximo a vencer
  'payment_due',            -- Pago vencido
  'system_maintenance',     -- Mantenimiento del sistema
  'data_export',            -- Exportación de datos
  'backup_completed',       -- Respaldo completado
  'security_alert'          -- Alerta de seguridad
);

-- Prioridades de notificación
CREATE TYPE notification_priority AS ENUM (
  'low',      -- Baja: informativa
  'normal',   -- Normal: operaciones rutinarias
  'high',     -- Alta: requiere atención
  'urgent'    -- Urgente: requiere acción inmediata
);

-- Canales de notificación
CREATE TYPE notification_channel AS ENUM (
  'in_app',   -- Notificación en la aplicación
  'email',    -- Correo electrónico
  'sms',      -- SMS
  'push',     -- Notificación push
  'webhook'   -- Webhook para integraciones
);

-- Tabla principal de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Información básica
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'normal',

  -- Destinatario
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Metadatos
  data JSONB DEFAULT '{}', -- Datos adicionales específicos del tipo de notificación

  -- Referencias a entidades relacionadas
  related_entity_type VARCHAR(50), -- 'sales_doc', 'purchase_doc', 'product', etc.
  related_entity_id UUID,          -- ID de la entidad relacionada

  -- Estado de la notificación
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Configuración de canales
  channels notification_channel[] DEFAULT ARRAY['in_app'::notification_channel],

  -- Programación
  scheduled_for TIMESTAMPTZ, -- NULL = enviar inmediatamente
  sent_at TIMESTAMPTZ,

  -- Intentos de envío
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,

  -- Expiración
  expires_at TIMESTAMPTZ,

  -- Agrupación (para notificaciones similares)
  group_key VARCHAR(255), -- Para agrupar notificaciones similares

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabla para configuración de notificaciones por usuario
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Configuración por tipo de notificación
  notification_type notification_type NOT NULL,

  -- Canales habilitados para este tipo
  enabled_channels notification_channel[] DEFAULT ARRAY['in_app'::notification_channel],

  -- Configuración específica
  is_enabled BOOLEAN DEFAULT TRUE,

  -- Horarios de envío (para evitar spam)
  quiet_hours_start TIME, -- Ej: 22:00
  quiet_hours_end TIME,   -- Ej: 08:00

  -- Días de la semana (1=lunes, 7=domingo)
  enabled_weekdays INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un usuario puede tener una configuración por tipo de notificación por empresa
  UNIQUE(user_id, company_id, notification_type)
);

-- Tabla para plantillas de notificaciones
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  name VARCHAR(100) NOT NULL,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,

  -- Contenido de la plantilla
  subject_template TEXT, -- Para email/SMS
  body_template TEXT NOT NULL,

  -- Variables disponibles en la plantilla
  available_variables TEXT[], -- ['user_name', 'company_name', 'amount', etc.]

  -- Configuración
  is_active BOOLEAN DEFAULT TRUE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = plantilla global

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(type, channel, company_id)
);

-- Tabla para historial de notificaciones enviadas (para auditoría)
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,

  channel notification_channel NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'delivered', 'opened'

  -- Detalles del envío
  sent_to TEXT NOT NULL,      -- email, phone, etc.
  external_id TEXT,           -- ID del proveedor externo (SendGrid, etc.)

  -- Respuesta/Error
  response_data JSONB,
  error_message TEXT,

  -- Métricas
  sent_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_group_key ON notifications(group_key);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_company ON notification_preferences(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type_channel ON notification_templates(type, channel);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON notification_delivery_log(status);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- Habilitar RLS en todas las tablas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Función para crear notificación automática
CREATE OR REPLACE FUNCTION create_notification(
  p_title TEXT,
  p_message TEXT,
  p_type notification_type,
  p_recipient_user_id UUID,
  p_company_id UUID,
  p_priority notification_priority DEFAULT 'normal',
  p_data JSONB DEFAULT '{}',
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_channels notification_channel[] DEFAULT ARRAY['in_app'::notification_channel],
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_group_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    title, message, type, priority,
    recipient_user_id, company_id,
    data, related_entity_type, related_entity_id,
    channels, scheduled_for, expires_at, group_key,
    created_by
  ) VALUES (
    p_title, p_message, p_type, p_priority,
    p_recipient_user_id, p_company_id,
    p_data, p_related_entity_type, p_related_entity_id,
    p_channels, p_scheduled_for, p_expires_at, p_group_key,
    auth.uid()
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id;
  RETURN FOUND;
END;
$$;

-- Función para obtener el conteo de notificaciones no leídas
CREATE OR REPLACE FUNCTION get_unread_notifications_count(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notifications
  WHERE recipient_user_id = p_user_id
    AND company_id = p_company_id
    AND is_read = FALSE;
$$;

-- Función para limpiar notificaciones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()
  RETURNING COUNT(*) INTO deleted_count;
  RETURN deleted_count;
END;
$$;

-- Contenido de C:\Proyectos\sistema-erp-inventario\supabase\migrations\20250823122562_notifications_policies_triggers.sql
-- Políticas RLS para el sistema de notificaciones

-- Helper: comprueba si el usuario autenticado pertenece a la empresa indicada
-- Retorna true si existe una fila activa en user_companies para auth.uid() y company_id
CREATE OR REPLACE FUNCTION auth_has_company_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.company_id = p_company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = TRUE
      AND (uc.valid_until IS NULL OR uc.valid_until > NOW())
  );
$$;

-- Helper: devuelve el rol obtenido desde claims/jwt o un valor por defecto
CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('jwt.claims.role', true), ''),
    NULLIF(current_setting('request.jwt.claims.role', true), ''),
    NULLIF(current_setting('supabase.auth.role', true), ''),
    'authenticated'
  );
$$;

-- Helper: comprueba si el usuario tiene un permiso concreto en la empresa
CREATE OR REPLACE FUNCTION auth_has_permission(p_permission TEXT, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_companies uc
    JOIN public.roles r ON r.id = uc.role_id
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = p_company_id
      AND uc.is_active = TRUE
      AND (
        r.permissions @> '[]'::jsonb /* fallback false if empty */
        OR r.permissions @> ('["*"]')::jsonb
        OR r.permissions @> to_jsonb(ARRAY[p_permission])
        OR (uc.permissions_override IS NOT NULL AND uc.permissions_override @> to_jsonb(ARRAY[p_permission]))
      )
  );
$$;

-- Políticas para la tabla notifications
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (
    recipient_user_id = auth.uid()
    OR auth_has_company_access(company_id)
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (
    auth_has_company_access(company_id)
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (
    recipient_user_id = auth.uid() -- Solo el destinatario puede marcar como leído
    OR (auth_has_permission('admin.notifications', company_id) AND created_by = auth.uid())
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (
    recipient_user_id = auth.uid()
    OR auth_has_permission('admin.notifications', company_id)
    OR auth_role() = 'service_role'
  );

-- Políticas para notification_preferences
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
CREATE POLICY "notification_preferences_select" ON notification_preferences
  FOR SELECT USING (
    user_id = auth.uid()
    OR auth_has_permission('admin.notifications', company_id)
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
CREATE POLICY "notification_preferences_insert" ON notification_preferences
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR auth_has_permission('admin.notifications', company_id)
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;
CREATE POLICY "notification_preferences_update" ON notification_preferences
  FOR UPDATE USING (
    user_id = auth.uid()
    OR auth_has_permission('admin.notifications', company_id)
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notification_preferences_delete" ON notification_preferences;
CREATE POLICY "notification_preferences_delete" ON notification_preferences
  FOR DELETE USING (
    user_id = auth.uid()
    OR auth_has_permission('admin.notifications', company_id)
    OR auth_role() = 'service_role'
  );

-- Políticas para notification_templates
DROP POLICY IF EXISTS "notification_templates_select" ON notification_templates;
CREATE POLICY "notification_templates_select" ON notification_templates
  FOR SELECT USING (
    company_id IS NULL -- Plantillas globales visibles para todos
    OR auth_has_company_access(company_id)
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notification_templates_modify" ON notification_templates;
CREATE POLICY "notification_templates_modify" ON notification_templates
  FOR ALL USING (
    auth_has_permission('admin.notifications', company_id)
    OR auth_role() = 'service_role'
  )
  WITH CHECK (
    auth_has_permission('admin.notifications', company_id)
    OR auth_role() = 'service_role'
  );

-- Políticas para notification_delivery_log
DROP POLICY IF EXISTS "notification_delivery_log_select" ON notification_delivery_log;
CREATE POLICY "notification_delivery_log_select" ON notification_delivery_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_delivery_log.notification_id
        AND (n.recipient_user_id = auth.uid() OR auth_has_company_access(n.company_id))
    )
    OR auth_role() = 'service_role'
  );

DROP POLICY IF EXISTS "notification_delivery_log_insert" ON notification_delivery_log;
CREATE POLICY "notification_delivery_log_insert" ON notification_delivery_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_delivery_log.notification_id
        AND auth_has_company_access(n.company_id)
    )
    OR auth_role() = 'service_role'
  );

-- No permitir UPDATE/DELETE en delivery_log para mantener integridad del audit trail
DROP POLICY IF EXISTS "notification_delivery_log_no_modify" ON notification_delivery_log;
CREATE POLICY "notification_delivery_log_no_modify" ON notification_delivery_log
  FOR UPDATE USING (auth_role() = 'service_role');

CREATE POLICY "notification_delivery_log_no_delete" ON notification_delivery_log
  FOR DELETE USING (auth_role() = 'service_role');

-- Función para crear preferencias por defecto cuando se asigna un usuario a una empresa
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_types notification_type[];
  ntype notification_type;
BEGIN
  -- Solo crear preferencias cuando se activa una relación user_company
  IF NEW.is_active = TRUE AND (OLD IS NULL OR OLD.is_active = FALSE) THEN
    -- Obtener todos los tipos de notificación
    SELECT ARRAY(SELECT enumvals FROM (
      SELECT unnest(enum_range(NULL::notification_type)) AS enumvals
    ) AS enum_values) INTO notification_types;

    -- Crear preferencias por defecto para cada tipo
    FOREACH ntype IN ARRAY notification_types
    LOOP
      INSERT INTO notification_preferences (
        user_id,
        company_id,
        notification_type,
        enabled_channels,
        is_enabled
      ) VALUES (
        NEW.user_id,
        NEW.company_id,
        ntype,
        CASE 
          WHEN ntype IN ('sale_created', 'purchase_created', 'stock_low', 'stock_out') THEN 
            ARRAY['in_app'::notification_channel, 'email'::notification_channel]
          WHEN ntype IN ('security_alert', 'system_maintenance') THEN 
            ARRAY['in_app'::notification_channel, 'email'::notification_channel, 'push'::notification_channel]
          ELSE 
            ARRAY['in_app'::notification_channel]
        END,
        TRUE
      ) ON CONFLICT (user_id, company_id, notification_type) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para crear preferencias por defecto
CREATE TRIGGER trigger_create_default_notification_preferences
  AFTER INSERT OR UPDATE ON user_companies
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Función para enviar notificación cuando se crea una venta
CREATE OR REPLACE FUNCTION notify_sale_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  admin_users UUID[];
  admin_user UUID;
BEGIN
  -- Obtener usuarios administradores de la empresa
  SELECT ARRAY(
    SELECT uc.user_id
    FROM user_companies uc
    JOIN roles r ON uc.role_id = r.id
    WHERE uc.company_id = NEW.company_id
      AND uc.is_active = TRUE
      AND r.permissions ? 'sales.read'
  ) INTO admin_users;

  -- Enviar notificación a cada administrador
  FOREACH admin_user IN ARRAY admin_users
  LOOP
    SELECT create_notification(
      'Nueva Venta Creada',
      format('Se ha creado una nueva venta %s por un monto de %s', NEW.doc_number, NEW.total_amount),
      'sale_created'::notification_type,
      admin_user,
      NEW.company_id,
      'normal'::notification_priority,
      jsonb_build_object(
        'sale_id', NEW.id,
        'doc_number', NEW.doc_number,
        'amount', NEW.total_amount,
        'currency', NEW.currency_code,
        'customer_id', NEW.party_id
      ),
      'sales_docs',
      NEW.id
    ) INTO notification_id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger para notificar creación de ventas
CREATE TRIGGER trigger_notify_sale_created
  AFTER INSERT ON sales_docs
  FOR EACH ROW
  EXECUTE FUNCTION notify_sale_created();

-- Función para enviar notificación de stock bajo
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  admin_users UUID[];
  admin_user UUID;
  product_info RECORD;
BEGIN
  -- Obtener información del producto (incluye min_stock)
  SELECT p.name, p.sku, p.min_stock, c.legal_name as company_name
  INTO product_info
  FROM products p
  JOIN warehouses w ON w.id = NEW.warehouse_id
  JOIN companies c ON c.id = w.company_id
  WHERE p.id = NEW.product_id;

  -- current/balance stock actual
  IF COALESCE(NEW.balance_qty, 0) <= COALESCE(product_info.min_stock, 0) THEN
    -- Obtener usuarios con permisos de inventario
    SELECT ARRAY(
      SELECT uc.user_id
      FROM user_companies uc
      JOIN roles r ON uc.role_id = r.id
      JOIN warehouses w ON w.company_id = uc.company_id
      WHERE w.id = NEW.warehouse_id
        AND uc.is_active = TRUE
        AND r.permissions ? 'inventory.warehouses'
    ) INTO admin_users;

    -- Enviar notificación a cada usuario autorizado
    FOREACH admin_user IN ARRAY admin_users
    LOOP
      SELECT create_notification(
        'Stock Bajo',
        format('El producto %s (%s) tiene stock bajo: %s unidades (mínimo: %s)',
               product_info.name, product_info.sku, NEW.balance_qty, product_info.min_stock),
        'stock_low'::notification_type,
        admin_user,
        (SELECT company_id FROM warehouses WHERE id = NEW.warehouse_id),
        'high'::notification_priority,
        jsonb_build_object(
          'product_id', NEW.product_id,
          'warehouse_id', NEW.warehouse_id,
          'current_stock', NEW.balance_qty,
          'min_stock', product_info.min_stock,
          'product_name', product_info.name,
          'product_sku', product_info.sku
        ),
        'warehouse_stock',
        NEW.warehouse_id || ':' || NEW.product_id
      ) INTO notification_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para notificar stock bajo
CREATE TRIGGER trigger_notify_low_stock
  AFTER INSERT OR UPDATE ON warehouse_stock
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

COMMENT ON FUNCTION create_default_notification_preferences() IS 'Crea preferencias de notificación por defecto cuando se asigna un usuario a una empresa';
COMMENT ON FUNCTION notify_sale_created() IS 'Envía notificación cuando se crea una nueva venta';
COMMENT ON FUNCTION notify_low_stock() IS 'Envía notificación cuando el stock está por debajo del mínimo';

-- Contenido de C:\Proyectos\sistema-erp-inventario\supabase\migrations\20250823130000_add_storage_locations_and_stock_location.sql
-- Migration: add storage locations and per-location stock aggregate
-- Date: 2025-08-23
-- Purpose: add `storage_locations`, `warehouse_stock_location`, add `location_id` to stock_ledger
-- and simple trigger-based maintenance functions to keep per-location balances updated.

-- PASO: Crear tabla de ubicaciones (bins / slots)
CREATE TABLE IF NOT EXISTS public.storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,
  code text NOT NULL, -- ej. 'A01-R03-S02'
  name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS idx_storage_locations_company ON public.storage_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_storage_locations_warehouse ON public.storage_locations(warehouse_id);

-- PASO: Agregar columna location_id al ledger (si no existe)
ALTER TABLE public.stock_ledger
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.storage_locations(id);

-- PASO: Tabla agregada por ubicación (balance por location)
CREATE TABLE IF NOT EXISTS public.warehouse_stock_location (
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  balance_qty numeric(18,6) NOT NULL DEFAULT 0,
  PRIMARY KEY (location_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_location_warehouse_product ON public.warehouse_stock_location(warehouse_id, product_id);

-- PASO: Función que refresca el balance para una location/product usando stock_ledger
CREATE OR REPLACE FUNCTION public.refresh_warehouse_stock_location(p_location uuid, p_product uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qty numeric(18,6);
  v_warehouse uuid;
BEGIN
  IF p_location IS NULL OR p_product IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(COALESCE(sl.qty_in,0) - COALESCE(sl.qty_out,0)), 0)
  INTO v_qty
  FROM public.stock_ledger sl
  WHERE sl.location_id = p_location
    AND sl.product_id = p_product;

  SELECT warehouse_id INTO v_warehouse FROM public.storage_locations WHERE id = p_location;

  IF v_qty = 0 THEN
    DELETE FROM public.warehouse_stock_location WHERE location_id = p_location AND product_id = p_product;
  ELSE
    INSERT INTO public.warehouse_stock_location (warehouse_id, location_id, product_id, balance_qty)
    VALUES (v_warehouse, p_location, p_product, v_qty)
    ON CONFLICT (location_id, product_id) DO UPDATE SET balance_qty = EXCLUDED.balance_qty;
  END IF;
END;
$$;

-- PASO: Trigger que llama a la función cuando cambian filas en stock_ledger
CREATE OR REPLACE FUNCTION public.trg_refresh_warehouse_stock_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.location_id IS NOT NULL THEN
      PERFORM public.refresh_warehouse_stock_location(OLD.location_id, OLD.product_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- refresh old location (if changed)
    IF OLD.location_id IS NOT NULL AND OLD.location_id <> NEW.location_id THEN
      PERFORM public.refresh_warehouse_stock_location(OLD.location_id, OLD.product_id);
    END IF;
    -- refresh new location
    IF NEW.location_id IS NOT NULL THEN
      PERFORM public.refresh_warehouse_stock_location(NEW.location_id, NEW.product_id);
    END IF;
    RETURN NEW;
  ELSE -- INSERT
    IF NEW.location_id IS NOT NULL THEN
      PERFORM public.refresh_warehouse_stock_location(NEW.location_id, NEW.product_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- Crear trigger (AFTER para que balances reflejen cambios ya visibles)
DROP TRIGGER IF EXISTS trg_refresh_warehouse_stock_location ON public.stock_ledger;
CREATE TRIGGER trg_refresh_warehouse_stock_location
AFTER INSERT OR UPDATE OR DELETE ON public.stock_ledger
FOR EACH ROW
EXECUTE FUNCTION public.trg_refresh_warehouse_stock_location();

-- PASO: Procedimiento de backfill (instrucciones, no lo ejecutes automáticamente aquí)
-- 1) Crear ubicaciones por defecto para cada warehouse/zone (si quieres mapear zonas a una ubicación por defecto):
--    INSERT INTO public.storage_locations (company_id, warehouse_id, zone_id, code, name)
--    SELECT w.company_id, w.id, wz.id, 'DEFAULT', 'Default location for ' || wz.code
--    FROM public.warehouses w
--    LEFT JOIN public.warehouse_zones wz ON wz.warehouse_id = w.id;

-- 2) Asignar las filas existentes del ledger a una location por defecto (ejemplo si creaste DEFAULT locations):
--    UPDATE public.stock_ledger sl
--    SET location_id = sl.zone_id_default_location_id -- adapt as needed
--    WHERE sl.location_id IS NULL AND sl.zone_id IS NOT NULL;

-- 3) Poblar warehouse_stock_location desde el ledger con un INSERT-SELECT agregando por location/product:
--    INSERT INTO public.warehouse_stock_location (warehouse_id, location_id, product_id, balance_qty)
--    SELECT sl_agg.warehouse_id, sl_agg.location_id, sl_agg.product_id, sl_agg.qty
--    FROM (
--      SELECT loc.warehouse_id, sl.location_id, sl.product_id, SUM(COALESCE(sl.qty_in,0)-COALESCE(sl.qty_out,0)) AS qty
--      FROM public.stock_ledger sl
--      JOIN public.storage_locations loc ON loc.id = sl.location_id
--      GROUP BY loc.warehouse_id, sl.location_id, sl.product_id
--    ) sl_agg
--    WHERE sl_agg.qty <> 0
--    ON CONFLICT (location_id, product_id) DO UPDATE SET balance_qty = EXCLUDED.balance_qty;

-- Nota: el backfill puede requerir ajustes según cómo quieras mapear zonas existentes a locations.

-- Fin de migración

CREATE OR REPLACE FUNCTION calculate_exchange_rate_difference(
    p_company_id UUID
)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    original_currency VARCHAR(3),
    weighted_avg_purchase_exchange_rate NUMERIC,
    current_exchange_rate NUMERIC,
    stock_quantity NUMERIC,
    value_at_purchase NUMERIC,
    current_value NUMERIC,
    difference NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH current_stock AS (
        SELECT ws.product_id, SUM(ws.balance_qty) as total_qty
        FROM warehouse_stock ws
        JOIN warehouses w ON w.id = ws.warehouse_id
        WHERE w.company_id = p_company_id
        GROUP BY ws.product_id
        HAVING SUM(ws.balance_qty) > 0
    ),
    purchase_data AS (
        SELECT
            sl.product_id,
            sl.original_currency_code,
            SUM(sl.qty_in * sl.exchange_rate) / SUM(sl.qty_in) as weighted_avg_exchange_rate,
            SUM(sl.qty_in) as total_purchased_qty
        FROM stock_ledger sl
        WHERE sl.company_id = p_company_id
          AND sl.qty_in > 0
          AND sl.original_currency_code IS NOT NULL
          AND sl.exchange_rate IS NOT NULL
        GROUP BY sl.product_id, sl.original_currency_code
    ),
    latest_rates AS (
        SELECT DISTINCT ON (from_currency_code, to_currency_code)
            from_currency_code,
            to_currency_code,
            rate
        FROM public.exchange_rates
        ORDER BY from_currency_code, to_currency_code, rate_date DESC
    )
    SELECT
        cs.product_id,
        p.name as product_name,
        pd.original_currency_code,
        pd.weighted_avg_exchange_rate,
        lr.rate as current_exchange_rate,
        cs.total_qty as stock_quantity,
        (cs.total_qty * pd.weighted_avg_exchange_rate) as value_at_purchase,
        (cs.total_qty * lr.rate) as current_value,
        (cs.total_qty * lr.rate) - (cs.total_qty * pd.weighted_avg_exchange_rate) as difference
    FROM current_stock cs
    JOIN products p ON p.id = cs.product_id
    JOIN purchase_data pd ON pd.product_id = cs.product_id
    JOIN latest_rates lr ON lr.from_currency_code = pd.original_currency_code AND lr.to_currency_code = (SELECT currency_code FROM companies WHERE id = p_company_id);
END; 
$$;

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user to read their own branches" ON public.branches AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own brands" ON public.brands AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own categories" ON public.categories AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own companies" ON public.companies AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own document_counters" ON public.document_counters AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own document_series" ON public.document_series AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own documents_archivos" ON public.documents_archivos AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own drivers" ON public.drivers AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own exchange_rates" ON public.exchange_rates AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own parties" ON public.parties AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own party_contacts" ON public.party_contacts AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own products" ON public.products AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own product_images" ON public.product_images AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own product_codes" ON public.product_codes AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own product_location" ON public.product_location AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own vehicles" ON public.vehicles AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own vehicle_drivers" ON public.vehicle_drivers AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own warehouses" ON public.warehouses AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own warehouse_zones" ON public.warehouse_zones AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own warehouse_stock_location" ON public.warehouse_stock_location AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own warehouse_stock" ON public.warehouse_stock AS PERMISSIVE FOR ALL TO public USING ( true);
CREATE POLICY "Allow user to read their own user_companies" ON public.user_companies AS PERMISSIVE FOR ALL TO public USING ( true);