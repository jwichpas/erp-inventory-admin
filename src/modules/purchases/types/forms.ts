// Tipos para formularios y validación

import type {
  CurrencyCodeType,
  DocumentTypeType,
  OperationTypeType,
  IGVAffectationType,
} from './enums'

// ============================================================================
// FORMULARIOS DE ÓRDENES DE COMPRA
// ============================================================================

export interface PurchaseOrderFormData {
  company_id: string
  supplier_id: string
  branch_id?: string
  order_date: string
  expected_delivery_date?: string
  currency_code: CurrencyCodeType
  exchange_rate?: number
  notes?: string
  items: PurchaseOrderItemFormData[]
}

export interface PurchaseOrderItemFormData {
  product_id: string
  description?: string
  unit_code: string
  quantity: number
  unit_price: number
}

// ============================================================================
// FORMULARIOS DE DOCUMENTOS DE COMPRA
// ============================================================================

export interface PurchaseDocFormData {
  supplier_id: string
  doc_type: DocumentTypeType
  series: string
  number: string
  issue_date: string
  arrival_date?: string
  currency_code: CurrencyCodeType
  exchange_rate?: number
  op_type?: OperationTypeType
  purchase_order_id?: string
  items: PurchaseDocItemFormData[]
}

export interface PurchaseDocItemFormData {
  product_id: string
  description?: string
  unit_code: string
  quantity: number
  unit_cost: number
  discount_pct?: number
  igv_affectation: IGVAffectationType
}

// ============================================================================
// FORMULARIOS DE RECEPCIONES
// ============================================================================

export interface ReceptionFormData {
  purchase_doc_id?: string
  supplier_id?: string
  warehouse_id: string
  reception_date: string
  doc_reference?: string
  notes?: string
  items: ReceptionItemFormData[]
}

export interface ReceptionItemFormData {
  product_id: string
  quantity_received: number
  quality_notes?: string
  batch_number?: string
  expiration_date?: string
}

// ============================================================================
// FILTROS PARA BÚSQUEDAS
// ============================================================================

export interface PurchaseOrderFilters {
  supplier_id?: string
  status?: string
  branch_id?: string
  currency_code?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
  sort_by?: 'order_date' | 'total_amount' | 'status' | 'supplier_name'
  sort_direction?: 'asc' | 'desc'
}

export interface PurchaseDocFilters {
  supplier_id?: string
  doc_type?: string
  status?: string
  currency_code?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
  sort_by?: 'issue_date' | 'total' | 'status' | 'supplier_name'
  sort_direction?: 'asc' | 'desc'
}

export interface ReceptionFilters {
  warehouse_id?: string
  supplier_id?: string
  status?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  limit?: number
  sort_by?: 'reception_date' | 'status' | 'supplier_name'
  sort_direction?: 'asc' | 'desc'
}

// ============================================================================
// RESPUESTAS DE API
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page?: number
  limit?: number
  has_next?: boolean
  has_previous?: boolean
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

// ============================================================================
// VALIDACIÓN
// ============================================================================

export interface ValidationError {
  field: string
  message: string
}

export interface FormValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// ============================================================================
// ACCIONES BULK
// ============================================================================

export interface BulkAction {
  action: 'approve' | 'reject' | 'cancel' | 'receive' | 'delete'
  ids: string[]
  reason?: string
}

export interface BulkActionResult {
  success: number
  failed: number
  errors: { id: string; error: string }[]
}

// ============================================================================
// CÁLCULOS DE IMPUESTOS
// ============================================================================

export interface TaxCalculation {
  subtotal: number
  igv_amount: number
  isc_amount: number
  discount_amount: number
  other_charges: number
  total: number
}

export interface LineCalculation {
  quantity: number
  unit_cost: number
  discount_pct: number
  subtotal_line: number
  discount_amount: number
  taxable_amount: number
  igv_amount: number
  isc_amount: number
  total_line: number
}

// ============================================================================
// REPORTES Y ANALÍTICAS
// ============================================================================

export interface PurchasesAnalytics {
  period_start: string
  period_end: string
  total_orders: number
  total_documents: number
  total_receptions: number
  total_amount: number
  currency_breakdown: {
    currency_code: CurrencyCodeType
    amount: number
    percentage: number
  }[]
  supplier_breakdown: {
    supplier_id: string
    supplier_name: string
    total_amount: number
    percentage: number
  }[]
  status_breakdown: {
    status: string
    count: number
    percentage: number
  }[]
}

// ============================================================================
// CONFIGURACIONES
// ============================================================================

export interface PurchaseSettings {
  auto_generate_orders: boolean
  require_approval: boolean
  approval_limit: number
  default_currency: CurrencyCodeType
  auto_receive_on_invoice: boolean
  three_way_matching: boolean
  enable_landed_costs: boolean
}
