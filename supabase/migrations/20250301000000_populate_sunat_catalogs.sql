-- ============================================================================
-- POBLACION INICIAL DE CATALOGOS SUNAT
-- ============================================================================
-- Esta migración puebla las tablas del esquema SUNAT con datos iniciales
-- necesarios para el funcionamiento del sistema ERP.
--
-- Fecha: 01/03/2025
-- Propósito: Inicializar catálogos SUNAT básicos
-- ============================================================================

-- CATÁLOGO 02: MONEDAS
-- ============================================================================
INSERT INTO sunat.cat_02_monedas (code, descripcion) VALUES
('PEN', 'Nuevos Soles'),
('USD', 'Dólares Americanos'),
('EUR', 'Euros'),
('GBP', 'Libras Esterlinas'),
('CAD', 'Dólares Canadienses'),
('JPY', 'Yen Japonés'),
('CHF', 'Franco Suizo'),
('AUD', 'Dólares Australianos'),
('BRL', 'Reales Brasileños'),
('CLP', 'Pesos Chilenos'),
('COP', 'Pesos Colombianos'),
('MXN', 'Pesos Mexicanos'),
('ARS', 'Pesos Argentinos'),
('UYU', 'Pesos Uruguayos'),
('BOB', 'Bolivianos'),
('VES', 'Bolívares Soberanos'),
('CNY', 'Yuan Chino'),
('KRW', 'Won Surcoreano')
ON CONFLICT (code) DO UPDATE SET
  descripcion = EXCLUDED.descripcion;

-- CATÁLOGO 06: UNIDADES DE MEDIDA (Básicas)
-- ============================================================================  
INSERT INTO sunat.cat_06_unidades_medida (code, descripcion) VALUES
('NIU', 'Unidad (Servicios)'),
('ZZ', 'Unidad'),
('KGM', 'Kilogramo'),
('GRM', 'Gramo'),
('TNE', 'Tonelada Métrica'),
('LTR', 'Litro'),
('MTR', 'Metro'),
('CMT', 'Centímetro'),
('MTK', 'Metro Cuadrado'),
('MTQ', 'Metro Cúbico'),
('CMK', 'Centímetro Cuadrado'),
('CMQ', 'Centímetro Cúbico'),
('HUR', 'Hora'),
('DAY', 'Día'),
('WEE', 'Semana'),
('MON', 'Mes'),
('ANN', 'Año'),
('DZN', 'Docena'),
('PCS', 'Pieza'),
('SET', 'Juego/Set'),
('PAR', 'Par'),
('BX', 'Caja'),
('PK', 'Paquete'),
('RO', 'Rollo'),
('TU', 'Tubo'),
('BAG', 'Bolsa')
ON CONFLICT (code) DO UPDATE SET
  descripcion = EXCLUDED.descripcion;

-- CATÁLOGO 07: AFECTACIÓN DEL IGV
-- ============================================================================
INSERT INTO sunat.cat_07_afect_igv (code, descripcion) VALUES
('10', 'Gravado - Operación Onerosa'),
('11', 'Gravado - Retiro por premio'),
('12', 'Gravado - Retiro por donación'),
('13', 'Gravado - Retiro'),
('14', 'Gravado - Retiro por publicidad'),
('15', 'Gravado - Bonificaciones'),
('16', 'Gravado - Retiro por entrega a trabajadores'),
('17', 'Gravado - IVAP'),
('20', 'Exonerado - Operación Onerosa'),
('21', 'Exonerado - Transferencia gratuita'),
('30', 'Inafecto - Operación Onerosa'),
('31', 'Inafecto - Retiro por bonificación'),
('32', 'Inafecto - Retiro'),
('33', 'Inafecto - Retiro por muestras médicas'),
('34', 'Inafecto - Retiro por convenio colectivo'),
('35', 'Inafecto - Retiro por premio'),
('36', 'Inafecto - Retiro por publicidad'),
('40', 'Exportación de bienes o servicios')
ON CONFLICT (code) DO UPDATE SET
  descripcion = EXCLUDED.descripcion;

-- CATÁLOGO 10: TIPOS DE DOCUMENTOS
-- ============================================================================
INSERT INTO sunat.cat_10_tipo_documento (code, descripcion) VALUES
('01', 'Factura'),
('03', 'Boleta de Venta'),
('07', 'Nota de Crédito'),
('08', 'Nota de Débito'),
('09', 'Guía de Remisión Remitente'),
('12', 'Ticket de Máquina Registradora'),
('14', 'Recibo por servicios públicos'),
('18', 'Documento autorizado libro de ingresos y gastos'),
('20', 'Comprobante de Retención'),
('40', 'Constancia de depósito de detracción'),
('56', 'Comprobante de pago SEDAM Huancayo S.A.'),
('71', 'Guía de Remisión Transportista'),
('72', 'Documento de Autorización Aduanera'),
('91', 'Comprobante de No Domiciliado'),
('97', 'Nota de Crédito - No Domiciliado'),
('98', 'Nota de Débito - No Domiciliado')
ON CONFLICT (code) DO UPDATE SET
  descripcion = EXCLUDED.descripcion;

-- CATÁLOGO 17: TIPOS DE OPERACIÓN
-- ============================================================================
INSERT INTO sunat.cat_17_tipo_operacion (code, descripcion) VALUES
('0101', 'Venta interna'),
('0112', 'Venta interna - Sustenta Gastos Deducibles Persona Natural'),
('0113', 'Venta interna - NRUS'),
('0200', 'Exportación de bienes'),
('0201', 'Exportación de servicios'),
('0202', 'Exportación de bienes y servicios'),
('0401', 'Venta interna - No domiciliados'),
('1001', 'Operación sujeta a detracción'),
('1002', 'Operación sujeta a detracción - Recursos hidrobiológicos'),
('1003', 'Operación sujeta a detracción - Madera'),
('1004', 'Operación sujeta a detracción - Otros recursos'),
('2001', 'Operación sujeta a percepción')
ON CONFLICT (code) DO UPDATE SET
  descripcion = EXCLUDED.descripcion;

-- VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================================================
DO $$
DECLARE
    monedas_count INTEGER;
    unidades_count INTEGER;
    afectacion_count INTEGER;
    documentos_count INTEGER;
    operaciones_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO monedas_count FROM sunat.cat_02_monedas;
    SELECT COUNT(*) INTO unidades_count FROM sunat.cat_06_unidades_medida;
    SELECT COUNT(*) INTO afectacion_count FROM sunat.cat_07_afect_igv;
    SELECT COUNT(*) INTO documentos_count FROM sunat.cat_10_tipo_documento;
    SELECT COUNT(*) INTO operaciones_count FROM sunat.cat_17_tipo_operacion;
    
    RAISE NOTICE 'Catálogos SUNAT inicializados correctamente:';
    RAISE NOTICE '- Monedas: % registros', monedas_count;
    RAISE NOTICE '- Unidades de medida: % registros', unidades_count;
    RAISE NOTICE '- Afectación IGV: % registros', afectacion_count;
    RAISE NOTICE '- Tipos de documento: % registros', documentos_count;
    RAISE NOTICE '- Tipos de operación: % registros', operaciones_count;
END $$;

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