You are an expert full-stack developer specializing in Vue.js 3 applications with a focus on enterprise resource planning (ERP) systems. Your task is to create a comprehensive frontend application for a multi-company ERP system that complies with Peru's SUNAT regulations. The system handles electronic invoicing, inventory control with 3D warehouse visualizations, multi-company management, notifications, auditing, and advanced reporting.

The backend is built on Supabase (PostgreSQL-based), and the schema includes the following tables, views, and functions. Use these to maximize the database's potential by querying them appropriately via Supabase's JavaScript client. Ensure all interactions are secure, using Row Level Security (RLS) where applicable, and handle authentication with Supabase Auth.

### Key Technologies to Use:
- **Vue 3** with Composition API (for reactive state management and hooks).
- **TypeScript** for type safety; define interfaces/types for all data models based on the tables below.
- **Tailwind CSS** for styling; create responsive, modern UI components with utility classes.
- **Zod** for schema validation; use it to validate forms, API responses, and user inputs.
- **Three.js** for 3D warehouse visualizations; implement interactive 3D models of warehouses, zones, and storage locations (e.g., render warehouse layouts with zones as colored regions, products as 3D objects, and highlight low-stock areas).
- **Pinia** for state management; create stores for user data, company selection, inventory, notifications, etc.
- **Vue Router** for navigation; set up routes with guards for authentication and role-based access (e.g., /dashboard, /inventory, /sales, /reports).
- **ApexCharts** for data visualization; use for dashboards showing sales trends, inventory levels, profit simulations, and exchange rate differences.
- **TanStack Query (formerly Vue Query)** for data fetching and caching; integrate with Supabase for querying tables, handling pagination, infinite scrolling, and optimistic updates.
- **Vue-PDF-Viewer** for displaying PDF reports (e.g., SUNAT formats, invoices).
- **SheetJS** for Excel/CSV exports; allow users to export reports like Kardex, sales analysis, or inventory valuations.
- **Day.js** for date handling; format dates, handle timezones (UTC for backend, local for UI), and compute periods (e.g., monthly reports).
- **Supabase** for backend integration: Use the JS client for auth, realtime subscriptions (e.g., for notifications and stock updates), storage (e.g., product images, certificates), and database queries.

### System Features:
- **Multi-Company Support**: Users can switch between companies via a dropdown. Fetch user companies from `app_functions.get_user_companies()`. Store current company in Pinia.
- **Authentication & Authorization**: Use Supabase Auth. Check permissions with `app_functions.user_has_permission()` and `app_functions.auth_has_company_access()`. Implement role-based UI (e.g., hide admin features).
- **Dashboard**: Overview with ApexCharts for sales growth, inventory value, low-stock alerts, and unrealized gains/losses from exchange rates.
- **Inventory Management**: 3D warehouse viewer with Three.js (load zones from `warehouse_zones`, locations from `storage_locations`). Real-time stock updates via Supabase Realtime. Support serialized/batch items.
- **Sales & Purchases**: Forms for creating docs, with auto-numbering via `public.next_document_number()`. Integrate electronic invoicing configs from `companies`.
- **Reports**: Use materialized views for efficient querying. Export to PDF/Excel. Include SUNAT formats (e.g., 12.1, 13.1).
- **Notifications**: Realtime inbox with unread count from `get_unread_notifications_count()`. Mark as read with `mark_notification_as_read()`. Preferences editable from user settings.
- **Auditing & Maintenance**: Admin views for logs from `audit.activity_log`. Schedule refreshes with `refresh_all_materialized_views()`.
- **Internationalization**: Support Spanish (Peru) as default; use Day.js for locale dates.
- **Error Handling & Validation**: Use Zod for all forms. Handle Supabase errors gracefully.
- **Performance**: Use TanStack Query for caching. Lazy-load components. Paginate large tables (e.g., stock_ledger).
- **Compliance**: Ensure SUNAT catalogs are used in forms (fetch via RPC functions like `get_unit_measures()`).

### Database Schema Details:
Use Supabase's JS client to query these tables/views/functions. Define TypeScript types for each table's structure.

#### SUNAT Catalogs (Read-only for dropdowns/forms):
- **sunat.catalogs**: Master catalog (code, item_code, description, is_active, metadata). Use for generic lookups.
- **sunat.cat_06_doc_identidad**: Identity docs (code: '1' DNI, description).
- **sunat.cat_02_monedas**: Currencies (code: 'PEN', description).
- **sunat.doc_identidad** (materialized view): Active identity docs.
- **sunat.monedas** (materialized view): Active currencies.
- **sunat.cat_10_tipo_documento**: Doc types (code: '01' Factura, description).
- **sunat.cat_12_tipo_operacion**: Operation types.
- **sunat.cat_07_afect_igv**: IGV affectations (code: '10' Gravado).
- **sunat.cat_17_tipo_operacion**: Operation types.
- **sunat.cat_18_modalidad_traslado**: Transfer modalities.
- **sunat.cat_20_motivo_traslado**: Transfer reasons.
- **sunat.cat_06_unidades_medida**: Units (code: 'UND', description).
- **sunat.ubigeo**: Locations (code: '150101' Lima, departamento, provincia, distrito).

#### Core Tables:
- **public.roles**: Roles (id, name, permissions: JSONB array e.g. ['sales.read'], hierarchy_level).
- **public.companies**: Companies (id, ruc, legal_name, currency_code: 'PEN', valuation_method: 'PROMEDIO_MOVIL', sol_user/pass for e-invoicing, business_config: JSONB).
- **public.user_companies**: User-company links (user_id, company_id, role_id, permissions_override: JSONB, valid_from/until).
- **branches**: Branches (id, company_id, code, name, ubigeo_code).
- **warehouses**: Warehouses (id, company_id, branch_id, code, name, dimensions: width/height/length, total_area/volume generated, address, warehouse_type: 'GENERAL', max_capacity_kg).
- **warehouse_zones**: Zones (id, company_id, warehouse_id, code, dimensions, x/y/z_coordinate, shape_type: 'RECTANGLE', vertices: JSONB array of points, color_hex).
- **parties**: Customers/Suppliers (id, company_id, is_customer/supplier, doc_type, doc_number, razon_social, email).
- **party_contacts**: Contacts (id, company_id, party_id, name, email).
- **brands**: Brands (id, company_id, name, code).
- **categories**: Categories (id, company_id, parent_id, name, code, level).
- **public.products**: Products (id, company_id, sku, name, brand_id, category_id, unit_code, tipo_afectacion, dimensions: JSONB, is_serialized, min_stock, search_vector: TSVECTOR).
- **product_images**: Images (id, company_id, product_id, storage_path).
- **product_codes**: Codes (id, company_id, product_id, code_type: 'EAN', code_value).
- **product_purchase_prices**: Prices (id, company_id, product_id, supplier_id, unit_price, observed_at).
- **price_lists**: Lists (id, company_id, name, currency_code, is_default).
- **price_list_items**: Items (id, company_id, price_list_id, product_id, unit_price, valid_from/to).
- **vehicles**: Vehicles (id, company_id, plate, capacity_kg).
- **drivers**: Drivers (id, company_id, party_id, license_number).
- **sales_docs**: Sales (id, company_id, customer_id, doc_type, series, number, issue_date, total, greenter_xml).
- **sales_doc_items**: Items (id, company_id, sales_doc_id, product_id, quantity, unit_price).
- **purchase_docs**: Purchases (id, company_id, supplier_id, doc_type, series, number, total).
- **purchase_doc_items**: Items (id, company_id, purchase_doc_id, product_id, quantity, unit_cost).
- **public.stock_ledger** (partitioned by date): Movements (id, company_id, warehouse_id, zone_id, location_id, product_id, movement_date, qty_in/out, unit_cost_in/out, balance_qty).
- **warehouse_stock**: Aggregated stock (warehouse_id, product_id, balance_qty).
- **stock_transfers**: Transfers (id, company_id, from_warehouse_id, to_warehouse_id, transfer_date).
- **stock_transfer_items**: Items (id, company_id, transfer_id, product_id, quantity).
- **public.exchange_rates**: Rates (id, rate_date, from_currency_code, to_currency_code, rate).
- **public.document_series**: Series (id, company_id, document_type_code, series, warehouse_id).
- **public.document_counters**: Counters (id, company_id, document_type_code, series, last_number).
- **audit.activity_log** (partitioned): Logs (id, table_name, record_id, action, old/new_values, user_id, company_id).
- **notifications**: Notifications (id, title, message, type: ENUM e.g. 'stock_low', recipient_user_id, company_id, data: JSONB, is_read).
- **notification_preferences**: Preferences (id, user_id, company_id, notification_type, enabled_channels: ENUM array).
- **notification_templates**: Templates (id, type, channel, body_template).
- **notification_delivery_log**: Logs (id, notification_id, channel, status).
- **public.storage_locations**: Locations (id, company_id, warehouse_id, zone_id, code).
- **public.warehouse_stock_location**: Per-location stock (warehouse_id, location_id, product_id, balance_qty).

#### Materialized Views (For Reports):
- **public.mv_warehouse_stock**: Current stock with status (LOW_STOCK).
- **public.mv_sales_analysis**: Monthly sales with growth %.
- **mv_kardex_mensual**: Monthly Kardex (entradas/salidas, saldo_final).
- **public.mv_inventory_revaluation**: Revaluation (avg_cost_usd, revalued_cost_pen, total_unrealized_gain_loss).
- **public.mv_sales_profit_simulation**: Profit simulation (accounting_profit, simulated_profit, difference).

#### Views (For SUNAT Reports):
- **v_sunat_inventory_header**: Header for inventory reports.
- **v_sunat_formato_12_1**: Format 12.1 (physical inventory).
- **v_sunat_formato_13_1**: Format 13.1 (valued inventory).
- **v_sunat_formato_13_1_resumen_diario**: Daily summary.

#### Functions/RPCs (Call via Supabase):
- **trigger_set_timestamp()**: Auto-update timestamps.
- **get_unit_measures()**, **get_tax_affectations()**, etc.: RPC for catalogs.
- **calculate_inventory_balance()**: Compute balances.
- **compute_stock_ledger_balances()**: Trigger function.
- **sync_warehouse_stock()**: Sync aggregates.
- **public.next_document_number()**: Get next doc number.
- **refresh_all_materialized_views()**: Refresh views.
- **refresh_kardex_mensual()**: Refresh Kardex.
- **calculate_exchange_rate_difference()**: Exchange differences.
- **app_functions.user_has_permission()**: Check perms.
- **app_functions.get_user_companies()**: List user companies.
- **create_notification()**: Create notification.
- **mark_notification_as_read()**: Mark read.
- **get_unread_notifications_count()**: Unread count.
- **cleanup_expired_notifications()**: Cleanup.
- **public.refresh_warehouse_stock_location()**: Refresh location stock.

### Implementation Guidelines:
- **Structure**: Organize in src/ (components, views, stores, composables, types, utils).
- **Composables**: Create hooks like useCompanySwitcher(), useInventory3D(), useNotifications().
- **Realtime**: Subscribe to notifications, stock_ledger for live updates.
- **Forms**: Use Zod schemas for validation (e.g., product form with sku, min_stock).
- **3D Inventory**: In warehouse view, use Three.js to render a 3D scene: floor plan from zones' vertices/coordinates, color zones by stock status, click to view details.
- **Reports**: Query views, visualize with ApexCharts, export with SheetJS/Vue-PDF-Viewer.
- **Testing**: Add basic unit tests for composables/stores.
- **Accessibility & UX**: Use ARIA, responsive design with Tailwind.

Generate the complete Vue 3 project code based on this prompt, including setup files (main.ts, App.vue, router.ts), key components, and Pinia stores. Ensure it's production-ready with error boundaries and loading states.