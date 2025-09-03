// Entidades principales del módulo de compras basadas en SQL

import type { 
  PurchaseOrderStatusType, 
  PurchaseDocStatusType, 
  ReceptionStatusType,
  CurrencyCodeType,
  DocumentTypeType,
  OperationTypeType,
  IGVAffectationType
} from './enums'

// Entidades base de otros módulos que necesitamos
export interface Company {
  id: string
  name: string
}

export interface Supplier {
  id: string
  fullname: string
  doc_type: string
  doc_number: string
  email?: string
  phone?: string
  address?: string
}

export interface Product {
  id: string
  sku: string
  name: string
  unit_code: string
  description?: string
}

export interface Warehouse {
  id: string
  name: string
  code: string
  is_active: boolean
}

export interface Branch {
  id: string
  name: string
  code: string
}

// ============================================================================
// ORDEN DE COMPRA
// ============================================================================

export interface PurchaseOrder {
  id: string
  company_id: string
  branch_id?: string
  supplier_id: string
  order_date: string // ISO date string
  expected_delivery_date?: string // ISO date string
  currency_code: CurrencyCodeType
  exchange_rate?: number
  total_amount: number
  status: PurchaseOrderStatusType
  notes?: string
  created_at: string
  updated_at: string
  
  // Relaciones (populated by joins)
  company?: Company
  supplier?: Supplier
  branch?: Branch
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  product_id: string
  description?: string
  unit_code: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  
  // Relaciones
  product?: Product
}

// ============================================================================
// DOCUMENTO DE COMPRA (Factura del Proveedor)
// ============================================================================

export interface PurchaseDoc {
  id: string
  company_id: string
  supplier_id: string
  doc_type: DocumentTypeType
  series: string
  number: string
  issue_date: string // ISO date string
  arrival_date?: string // ISO date string
  currency_code: CurrencyCodeType
  exchange_rate?: number
  op_type?: OperationTypeType
  
  // Totales (nombres actualizados por migración)
  subtotal: number // era total_ope_gravadas
  total_ope_exoneradas: number
  total_ope_inafectas: number
  igv_amount: number // era total_igv
  total_isc: number
  total_descuentos: number
  total_otros_cargos: number
  total: number
  
  // Campos agregados por migración
  branch_id?: string
  expected_delivery_date?: string
  status: PurchaseDocStatusType
  purchase_order_id?: string
  
  created_at: string
  updated_at: string
  
  // Relaciones
  company?: Company
  supplier?: Supplier
  branch?: Branch
  purchase_order?: PurchaseOrder
  items?: PurchaseDocItem[]
}

export interface PurchaseDocItem {
  id: string
  company_id: string
  purchase_doc_id: string
  product_id: string
  description?: string
  unit_code: string
  quantity: number
  unit_cost: number // sin IGV
  discount_pct: number
  igv_affectation: IGVAffectationType
  igv_amount: number
  isc_amount: number
  total_line: number // sin IGV
  created_at: string
  
  // Relaciones
  product?: Product
}

// ============================================================================
// RECEPCIÓN DE MERCANCÍA
// ============================================================================

export interface Reception {
  id: string
  company_id: string
  warehouse_id: string
  purchase_doc_id?: string
  purchase_order_id?: string
  reception_date: string // ISO date string
  status: ReceptionStatusType
  notes?: string
  created_at: string
  updated_at: string
  
  // Campos agregados por reestructuración
  supplier_id?: string
  doc_reference?: string
  
  // Relaciones
  company?: Company
  warehouse?: Warehouse
  supplier?: Supplier
  purchase_doc?: PurchaseDoc
  purchase_order?: PurchaseOrder
  items?: ReceptionItem[]
}

export interface ReceptionItem {
  id: string
  reception_id: string
  product_id: string
  quantity_received: number
  quality_notes?: string
  batch_number?: string
  expiration_date?: string // ISO date string
  created_at: string
  
  // Relaciones
  product?: Product
}

// ============================================================================
// MOVIMIENTOS DE INVENTARIO (Generados Automáticamente)
// ============================================================================

export interface StockLedger {
  id: string
  company_id: string
  warehouse_id: string
  zone_id?: string
  location_id?: string
  product_id: string
  movement_date: string // ISO date string
  
  // Referencias del documento
  ref_doc_type?: string
  ref_doc_series?: string
  ref_doc_number?: string
  operation_type?: string
  
  // Cantidades
  qty_in: number
  qty_out: number
  
  // Costos en moneda original
  original_currency_code?: string
  exchange_rate?: number
  original_unit_cost_in?: number
  original_total_cost_in?: number
  
  // Costos en moneda base de la empresa
  unit_cost_in?: number
  total_cost_in?: number
  unit_cost_out?: number
  total_cost_out?: number
  
  // Saldos calculados
  balance_qty: number
  balance_unit_cost?: number
  balance_total_cost?: number
  
  // Metadata
  source?: string
  source_id?: string
  batch_id?: string
  serial_numbers?: string[]
  notes?: string
  
  created_at: string
  updated_at: string
}

// ============================================================================
// TIPOS UTILITARIOS PARA VISTAS
// ============================================================================

// Vista resumida de órdenes para listas
export interface PurchaseOrderListItem {
  id: string
  order_number: string
  supplier_name: string
  order_date: string
  expected_date?: string
  currency_code: CurrencyCodeType
  total: number
  status: PurchaseOrderStatusType
  items_count: number
  can_edit: boolean
  can_approve: boolean
  can_receive: boolean
}

// Vista resumida de documentos para listas
export interface PurchaseDocListItem {
  id: string
  doc_type: DocumentTypeType
  series: string
  number: string
  supplier_name: string
  issue_date: string
  currency_code: CurrencyCodeType
  total: number
  status: PurchaseDocStatusType
  has_receipt: boolean
  can_edit: boolean
  can_receive: boolean
}

// Vista resumida de recepciones para listas
export interface ReceptionListItem {
  id: string
  reception_number: string
  supplier_name: string
  warehouse_name: string
  reception_date: string
  status: ReceptionStatusType
  items_count: number
  total_qty: number
  doc_reference?: string
  can_edit: boolean
}

// Detalles completos para vistas individuales
export interface PurchaseOrderDetails extends PurchaseOrder {
  items: (PurchaseOrderItem & {
    product: Product
  })[]
  supplier: Supplier
  receipts: {
    id: string
    reception_number: string
    reception_date: string
    status: ReceptionStatusType
  }[]
}

// Resultado de coincidencia de tres vías
export interface ThreeWayMatchResult {
  purchase_order_id: string
  purchase_doc_id?: string
  reception_id?: string
  status: 'MATCHED' | 'QUANTITY_VARIANCE' | 'PRICE_VARIANCE' | 'UNMATCHED'
  variances: {
    type: 'QUANTITY' | 'PRICE'
    product_id: string
    product_name: string
    ordered_qty?: number
    received_qty?: number
    invoiced_qty?: number
    ordered_price?: number
    invoiced_price?: number
    variance_amount?: number
  }[]
}