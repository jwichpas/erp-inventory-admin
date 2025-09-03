Explicación General de la Base de Datos: Mapeo Lógico y Relaciones
Esta base de datos está diseñada para un Sistema ERP de Inventario compatible con SUNAT (Perú), enfocado en la gestión de inventarios, compras, ventas, facturación electrónica, control de stock y cumplimiento normativo. El esquema es optimizado para PostgreSQL 15+ y Supabase, con énfasis en seguridad (RLS), auditoría, particionamiento (para stock_ledger) y automatización mediante triggers y funciones.
El núcleo es el control de inventario valorado (kardex), que se actualiza automáticamente a través de triggers en tablas de movimientos (compras, ventas, recepciones, envíos, ajustes, devoluciones). Se integra con catálogos SUNAT para consistencia fiscal.
A continuación, presento un mapeo lógico:

    - Entidades Principales: Grupos de tablas por módulo (e.g., Empresas, Inventario, Compras/Ventas).
    - Relaciones: Cómo se conectan (FKs, 1:N, N:N).
    - Flujos de Datos: Cómo se propagan cambios (e.g., una compra actualiza stock).
    - Funciones y Triggers: Automatizaciones clave.
    - Vistas y Reportes: Para análisis y SUNAT.

Usaré notación simple para relaciones: - TablaA (1) --- (N) TablaB: Uno-a-muchos. - TablaA (N) --- (N) TablaB: Muchos-a-muchos (via tabla intermedia). - Claves: PK (Primary Key), FK (Foreign Key).

Para un diagrama visual, recomiendo herramientas como Draw.io o pgAdmin (ERD). Aquí incluyo un diagrama textual en Mermaid (cópialo a mermaid.live para renderizar):
erDiagram
COMPANIES ||--o{ USER_COMPANIES : "tiene usuarios en"
COMPANIES ||--o{ BRANCHES : "tiene sucursales"
COMPANIES ||--o{ WAREHOUSES : "tiene almacenes"
WAREHOUSES ||--o{ WAREHOUSE_ZONES : "tiene zonas"
WAREHOUSES ||--o{ STORAGE_LOCATIONS : "tiene ubicaciones"
COMPANIES ||--o{ PRODUCTS : "tiene productos"
PRODUCTS ||--o{ BRANDS : "pertenece a marca"
PRODUCTS ||--o{ CATEGORIES : "pertenece a categoría"
PRODUCTS ||--o{ PRODUCT_BATCHES : "tiene lotes"
PRODUCTS ||--o{ PRODUCT_SERIALS : "tiene series"
PRODUCTS ||--o{ PRODUCT_LOCATION : "tiene ubicaciones"
PRODUCTS ||--o{ WAREHOUSE_STOCK : "tiene stock en almacén"
PRODUCTS ||--o{ WAREHOUSE_STOCK_LOCATION : "tiene stock en ubicación"
COMPANIES ||--o{ PARTIES : "tiene clientes/proveedores"
PARTIES ||--o{ PARTY_CONTACTS : "tiene contactos"
COMPANIES ||--o{ VEHICLES : "tiene vehículos"
COMPANIES ||--o{ DRIVERS : "tiene conductores"
VEHICLES }o--o{ DRIVERS : "asignados via VEHICLE_DRIVERS"
COMPANIES ||--o{ PURCHASE_ORDERS : "tiene órdenes de compra"
PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : "tiene items"
PURCHASE_ORDERS ||--o{ PURCHASE_DOCS : "genera documentos de compra"
PURCHASE_DOCS ||--o{ PURCHASE_DOC_ITEMS : "tiene items"
PURCHASE_DOCS ||--o{ RECEPTIONS : "tiene recepciones"
RECEPTIONS ||--o{ RECEPTION_ITEMS : "tiene items"
COMPANIES ||--o{ SALES_ORDERS : "tiene órdenes de venta"
SALES_ORDERS ||--o{ SALES_ORDER_ITEMS : "tiene items"
SALES_ORDERS ||--o{ SALES_DOCS : "genera documentos de venta"
SALES_DOCS ||--o{ SALES_DOC_ITEMS : "tiene items"
SALES_DOCS ||--o{ SHIPMENTS : "tiene envíos"
SHIPMENTS ||--o{ SHIPMENT_ITEMS : "tiene items"
COMPANIES ||--o{ INVENTORY_ADJUSTMENTS : "tiene ajustes"
INVENTORY_ADJUSTMENTS ||--o{ ADJUSTMENT_ITEMS : "tiene items"
COMPANIES ||--o{ STOCK_TRANSFERS : "tiene transferencias"
STOCK_TRANSFERS ||--o{ STOCK_TRANSFER_ITEMS : "tiene items"
COMPANIES ||--o{ RETURNS : "tiene devoluciones"
RETURNS ||--o{ RETURN_ITEMS : "tiene items"
SALES_DOCS ||--o{ RETURNS : "devuelve venta"
PURCHASE_DOCS ||--o{ RETURNS : "devuelve compra"
COMPANIES ||--o{ PAYMENTS : "tiene pagos"
SALES_DOCS ||--o{ PAYMENTS : "paga venta"
PURCHASE_DOCS ||--o{ PAYMENTS : "paga compra"
SALES_DOC_ITEMS ||--o{ TAX_DETAILS : "tiene impuestos"
PURCHASE_DOC_ITEMS ||--o{ TAX_DETAILS : "tiene impuestos"
COMPANIES ||--o{ PRICE_LISTS : "tiene listas de precios"
PRICE_LISTS ||--o{ PRICE_LIST_ITEMS : "tiene items"
COMPANIES ||--o{ STOCK_LEDGER : "registra movimientos en ledger (particionado)"
STOCK_LEDGER ||--|{ WAREHOUSE_STOCK : "actualiza stock agregado"
STOCK_LEDGER ||--|{ WAREHOUSE_STOCK_LOCATION : "actualiza stock por ubicación"
SUNAT_CATALOGS ||--|| COMPANIES : "usa catálogos SUNAT (e.g., monedas, docs)"
COMPANIES ||--o{ NOTIFICATIONS : "genera notificaciones"
COMPANIES ||--o{ AUDIT_ACTIVITY_LOG : "registra auditoría (particionado)"

1. Visión General del Sistema

Propósito: Gestionar empresas multi-tenant (varias compañías), con control granular de usuarios/roles. Enfocado en inventario (stock valorado con métodos como PROMEDIO_MOVIL/FIFO), compras/ventas, logística (almacenes, transferencias), pagos y reportes SUNAT (e.g., formatos 12.1/13.1 para kardex).
Módulos Principales:

Configuración Base: Empresas, Usuarios, Roles, Catálogos SUNAT.
Inventario: Productos, Almacenes, Stock Ledger (histórico de movimientos).
Compras: Órdenes, Documentos, Recepciones, Devoluciones.
Ventas: Órdenes, Documentos, Envíos, Devoluciones.
Logística: Transferencias, Ajustes, Lotes/Series.
Finanzas: Pagos, Cuentas por Cobrar/Pagar, Impuestos.
Auditoría y Notificaciones: Logs, Alertas.

Características Clave:

Automatización: Triggers insertan en stock_ledger desde movimientos (e.g., recepciones → entradas de stock).
Seguridad: RLS en todas las tablas (basado en user_companies y permisos JSONB en roles).
Optimizaciones: Particionamiento en stock_ledger y audit.activity_log por fecha; vistas materializadas para reportes (e.g., mv_warehouse_stock, mv_kardex_mensual).
Cumplimiento: Integración con catálogos SUNAT (vistas como v_sunat_formato_13_1 para exportar kardex).

2. Entidades Principales y Relaciones

Empresas y Usuarios:

companies (PK: id) --- (N) user_companies (FK: company_id) --- (N) auth.users (via user_id).
companies --- (N) roles (pero roles son globales, con permisos JSONB).
Relación: Usuarios acceden a compañías via user_companies (con roles y permisos override). RLS filtra por auth.uid().

Sucursales, Almacenes y Ubicaciones:

companies (1) --- (N) branches (FK: company_id).
branches (1) --- (N) warehouses (FK: branch_id).
warehouses (1) --- (N) warehouse_zones (FK: warehouse_id).
warehouses (1) --- (N) storage_locations (FK: warehouse_id).
products (N) --- (N) product_location (FK: product_id, warehouse_zone_id).
Relación: Jerarquía espacial para inventario (compañía → sucursal → almacén → zona → ubicación). Stock agregado en warehouse_stock y warehouse_stock_location.

Productos y Catálogos:

companies (1) --- (N) products (FK: company_id).
products --- (1) brands (FK: brand_id).
products --- (1) categories (FK: category_id, soporta jerarquía via parent_id).
products (1) --- (N) product_batches / product_serials (FK: product_id).
products (1) --- (N) product_images / product_codes / product_purchase_prices.
sunat.catalogs (maestra) --- vistas materializadas como sunat.doc_identidad, sunat.monedas.
Relación: Productos son centrales; se vinculan a catálogos SUNAT (e.g., unit_code FK a cat_06_unidades_medida). Lotes/series para trazabilidad en productos controlados.

Clientes/Proveedores y Logística:

companies (1) --- (N) parties (FK: company_id; is_customer/supplier).
parties (1) --- (N) party_contacts.
companies (1) --- (N) vehicles / drivers.
vehicles (N) --- (N) drivers via vehicle_drivers.
Relación: Parties para entidades externas; vehículos/conductores para traslados (usados en stock_transfers, shipments).

Compras:

companies (1) --- (N) purchase_orders (FK: company_id) --- (N) purchase_order_items.
purchase_orders --- (1) purchase_docs (FK: purchase_order_id, opcional).
purchase_docs (1) --- (N) purchase_doc_items.
purchase_docs (1) --- (N) receptions (FK: purchase_doc_id) --- (N) reception_items.
purchase_docs (1) --- (N) returns (FK: original_doc_id, doc_type='PURCHASE_RETURN') --- (N) return_items.
Relación: Flujo: Orden → Documento (factura) → Recepción (entrada stock) → Devolución (salida stock).

Ventas:

Similar: companies (1) --- (N) sales_orders --- (N) sales_order_items.
sales_orders --- (1) sales_docs --- (N) sales_doc_items.
sales_docs (1) --- (N) shipments --- (N) shipment_items.
sales_docs (1) --- (N) returns (doc_type='SALE_RETURN') --- (N) return_items.
Relación: Orden → Documento → Envío (salida stock) → Devolución (entrada stock).

Inventario y Movimientos:

companies (1) --- (N) stock_ledger (FK: company_id; particionado por movement_date).
stock_ledger --- (1) warehouses (FK: warehouse_id).
stock_ledger --- (1) products (FK: product_id).
stock_ledger --- (1) storage_locations (FK: location_id).
stock_ledger --- (1) product_batches (FK: batch_id).
companies (1) --- (N) inventory_adjustments --- (N) adjustment_items.
companies (1) --- (N) stock_transfers --- (N) stock_transfer_items (FK: from_warehouse_id, to_warehouse_id).
Relación: stock_ledger es el "kardex" histórico; actualizado por triggers desde items de recepciones, envíos, ajustes, devoluciones, transferencias. Agregados en warehouse_stock / warehouse_stock_location.

Finanzas y Impuestos:

sales_docs / purchase_docs (1) --- (N) payments (FK: doc_id, doc_type).
sales_doc_items / purchase_doc_items (1) --- (N) tax_details (FK: doc_item_id).
Relación: Pagos reducen saldos en vistas como mv_accounts_receivable. Impuestos por línea para desglose SUNAT.

Otros:

companies (1) --- (N) price_lists --- (N) price_list_items.
companies (1) --- (N) notifications / notification_preferences.
audit.activity_log (particionado): Logs cambios en tablas clave.
exchange_rates: Tasas de cambio globales.

3. Flujos de Datos y Automatizaciones

Flujo de Compra:

Crear purchase_orders (pendiente).
Generar purchase_docs (factura proveedor).
Registrar receptions: Trigger trg_insert_stock_ledger_reception inserta en stock_ledger (qty_in), actualiza warehouse_stock via trigger_update_warehouse_stock.
Si devolución: returns → Trigger trg_insert_stock_ledger_return (qty_out).
Pago: Insert en payments → Actualiza vistas mv_accounts_payable.

Flujo de Venta:

sales_orders → sales_docs.
shipments: Trigger trg_insert_stock_ledger_shipment (qty_out, valida stock con check_stock_availability si se integra).
Devolución: returns → Trigger (qty_in).
Pago: payments → mv_accounts_receivable.

Inventario:

Movimientos (recepciones, envíos, etc.) → stock_ledger (triggers calculan saldos con compute_stock_ledger_balances).
Ajustes/Transferencias: Triggers similares.
Lotes/Series: Opcionales en items; actualizan qty_available en product_batches.
Notificaciones: Triggers como trigger_notify_low_stock en warehouse_stock.

Reportes:

Vistas SUNAT: v_sunat_formato_13_1 extrae de stock_ledger.
Funciones: generate_sunat_13_1_report para kardex; export_inventory_valuation para valoración.

Mantenimiento:

refresh_all_materialized_views: Actualiza vistas.
recalculate_all_ledger_balances: Corrige saldos.
purge_old_ledger_partitions: Limpia datos antiguos.
validate_stock_consistency: Chequea discrepancias.

4. Funciones Clave y Su Rol

Cálculos de Stock: calculate_inventory_balance (simula), compute_stock_ledger_balances (real en trigger).
Triggers: Automatizan inserts en stock_ledger (e.g., trg_insert_stock_ledger_purchase del original + nuevos).
Reportes/Validaciones: generate_sunat_13_1_report, check_stock_availability, validate_stock_consistency.
Integraciones: send_to_sunat_api (placeholder para facturación electrónica).
Notificaciones/Auditoría: create_notification, log_changes (trigger en tablas clave).
