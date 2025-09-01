// Core database types matching Supabase schema

export interface Company {
  id: string
  ruc: string
  legal_name: string
  commercial_name?: string
  currency_code: string
  valuation_method: 'PROMEDIO_MOVIL' | 'FIFO' | 'LIFO'
  sol_user?: string
  sol_pass?: string
  cert_path?: string
  business_config?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserCompany {
  user_id: string
  company_id: string
  role_id: string
  role_name: string
  company: Company
  permissions_override?: string[]
  valid_from: string
  valid_until?: string
  created_at: string
  updated_at: string
}

// Result type for RPC functions
export interface UserCompanyResult {
  company_id: string
  company_name: string
  role_name: string
  permissions: string[]
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  hierarchy_level: number
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  company_id: string
  code: string
  name: string
  ubigeo_code: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Warehouse {
  id: string
  company_id: string
  branch_id: string
  code: string
  name: string
  dimensions?: {
    width: number
    height: number
    length: number
  }
  total_area?: number
  total_volume?: number
  address?: string
  warehouse_type: 'GENERAL' | 'SPECIALIZED'
  max_capacity_kg?: number
  created_at: string
  updated_at: string
}

export interface WarehouseZone {
  id: string
  company_id: string
  warehouse_id: string
  code: string
  name: string
  dimensions?: {
    width: number
    height: number
    length: number
  }
  coordinates?: {
    x: number
    y: number
    z: number
  }
  shape_type: 'RECTANGLE' | 'CIRCLE' | 'POLYGON'
  vertices?: Array<{ x: number; y: number }>
  color_hex: string
  created_at: string
  updated_at: string
}

export interface StorageLocation {
  id: string
  company_id: string
  warehouse_id: string
  zone_id?: string
  code: string
  name: string
  coordinates?: {
    x: number
    y: number
    z: number
  }
  max_capacity_kg?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  company_id: string
  sku: string
  barcode?: string
  name: string
  description?: string
  brand_id: string
  category_id: string
  unit_code: string
  tipo_afectacion: string
  dimensions?: Record<string, any>
  weight_kg?: number
  is_serialized: boolean
  is_batch_controlled: boolean
  min_stock: number
  max_stock: number
  reorder_point: number
  active: boolean
  tags?: string[]
  search_vector?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  company_id: string
  name: string
  code?: string
  active: boolean
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Category {
  id: string
  company_id: string
  parent_id?: string
  name: string
  code?: string
  active: boolean
  level: number
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[]
}

export interface ProductCode {
  id: string
  company_id: string
  product_id: string
  code_type: string
  code_value: string
}

export interface ProductImage {
  id: string
  company_id: string
  product_id: string
  storage_path: string
  is_primary: boolean
  created_at: string
}

export interface Party {
  id: string
  company_id: string
  document_type: string
  document_number: string
  name: string
  commercial_name?: string
  email?: string
  phone?: string
  address?: string
  ubigeo_code?: string
  is_customer: boolean
  is_supplier: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'STOCK_LOW' | 'DOCUMENT_PENDING'
  recipient_user_id: string
  company_id: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
  read_at?: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  company_id: string
  notification_type: string
  enabled_channels: ('EMAIL' | 'PUSH' | 'IN_APP')[]
  created_at: string
  updated_at: string
}

// Document types
export interface SalesDocument {
  id: string
  company_id: string
  customer_id: string
  doc_type: string
  series: string
  number: string
  issue_date: string
  due_date?: string
  currency_code: string
  exchange_rate: number
  subtotal: number
  igv_amount: number
  total: number
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED'
  greenter_xml?: string
  greenter_cdr?: string
  greenter_hash?: string
  greenter_status?: string
  created_at: string
  updated_at: string
}

export interface SalesDocumentItem {
  id: string
  sales_doc_id: string
  product_id: string
  quantity: number
  unit_price: number
  discount_amount: number
  igv_amount: number
  total_amount: number
  created_at: string
  updated_at: string
}

export interface PurchaseDocument {
  id: string
  company_id: string
  supplier_id: string
  doc_type: string
  series: string
  number: string
  receipt_date: string
  due_date?: string
  currency_code: string
  exchange_rate: number
  subtotal: number
  igv_amount: number
  total: number
  status: 'DRAFT' | 'RECEIVED' | 'PAID' | 'CANCELLED'
  created_at: string
  updated_at: string
}

export interface PurchaseDocumentItem {
  id: string
  purchase_doc_id: string
  product_id: string
  quantity: number
  unit_cost: number
  discount_amount: number
  igv_amount: number
  total_amount: number
  created_at: string
  updated_at: string
}

// Stock and inventory types
export interface StockLedgerEntry {
  id: string
  company_id: string
  warehouse_id: string
  zone_id?: string
  location_id?: string
  product_id: string
  movement_date: string
  qty_in: number
  qty_out: number
  unit_cost_in?: number
  unit_cost_out?: number
  balance_qty: number
  balance_value: number
  reference?: string
  document_type?: string
  document_id?: string
  created_at: string
}

export interface WarehouseStock {
  id: string
  company_id: string
  warehouse_id: string
  product_id: string
  current_qty: number
  reserved_qty: number
  available_qty: number
  avg_cost: number
  total_value: number
  last_movement_date?: string
  updated_at: string
}

export interface WarehouseStockLocation {
  id: string
  company_id: string
  warehouse_id: string
  zone_id?: string
  location_id?: string
  product_id: string
  current_qty: number
  reserved_qty: number
  available_qty: number
  updated_at: string
}

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
      }
      warehouse_stock: {
        Row: WarehouseStock
        Insert: Omit<WarehouseStock, 'id' | 'updated_at'>
        Update: Partial<Omit<WarehouseStock, 'id' | 'updated_at'>>
      }
      // Add other tables as needed
    }
    Views: {
      mv_sales_analysis: {
        Row: SalesAnalysisView
      }
      mv_warehouse_stock: {
        Row: any // Define proper type based on materialized view
      }
      mv_inventory_revaluation: {
        Row: InventoryRevaluationView
      }
    }
    Functions: {
      calculate_exchange_rate_difference: {
        Args: { p_company_id: string }
        Returns: number
      }
      refresh_all_materialized_views: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
    }
  }
}

// SUNAT catalog types
export interface SUNATDocumentType {
  code: string
  description: string
  is_active: boolean
}

export interface SUNATUnitMeasure {
  code: string
  descripcion: string
}

export interface SUNATCurrency {
  code: string
  description: string
  symbol: string
  is_active: boolean
}

export interface SUNATTaxAffectation {
  code: string
  descripcion: string
}

// Materialized view types
export interface SalesAnalysisView {
  company_id: string
  period: string
  total_sales: number
  total_documents: number
  avg_ticket: number
  growth_rate: number
}

export interface InventoryRevaluationView {
  company_id: string
  product_id: string
  sku: string
  product_name: string
  current_stock: number
  avg_cost_usd: number
  accounting_avg_cost_pen: number
  current_exchange_rate: number
  revalued_cost_pen: number
  unit_cost_difference: number
  total_unrealized_gain_loss: number
}

export interface KardexMonthlyView {
  company_id: string
  warehouse_id: string
  product_id: string
  period: string
  initial_qty: number
  total_in: number
  total_out: number
  final_qty: number
  avg_cost: number
}
