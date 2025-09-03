// Tipos para las APIs y servicios

import type {
  PurchaseOrder,
  PurchaseDoc,
  Reception,
  PurchaseOrderListItem,
  PurchaseDocListItem,
  ReceptionListItem,
  ThreeWayMatchResult,
  TaxCalculation
} from './entities'

import type {
  PurchaseOrderFormData,
  PurchaseDocFormData,
  ReceptionFormData,
  PurchaseOrderFilters,
  PurchaseDocFilters,
  ReceptionFilters,
  PaginatedResponse,
  ApiResponse,
  BulkAction,
  BulkActionResult,
  PurchasesAnalytics
} from './forms'

// ============================================================================
// SERVICIOS DE ÓRDENES DE COMPRA
// ============================================================================

export interface PurchaseOrderService {
  // CRUD básico
  getOrders(filters?: PurchaseOrderFilters): Promise<PaginatedResponse<PurchaseOrderListItem>>
  getOrder(id: string): Promise<ApiResponse<PurchaseOrder>>
  createOrder(data: PurchaseOrderFormData): Promise<ApiResponse<PurchaseOrder>>
  updateOrder(id: string, data: Partial<PurchaseOrderFormData>): Promise<ApiResponse<PurchaseOrder>>
  deleteOrder(id: string): Promise<ApiResponse<void>>
  
  // Acciones específicas
  approveOrder(id: string, notes?: string): Promise<ApiResponse<void>>
  rejectOrder(id: string, reason: string): Promise<ApiResponse<void>>
  cancelOrder(id: string, reason: string): Promise<ApiResponse<void>>
  duplicateOrder(id: string): Promise<ApiResponse<PurchaseOrder>>
  
  // Acciones en lote
  bulkAction(action: BulkAction): Promise<BulkActionResult>
  
  // Exportación
  exportOrders(filters?: PurchaseOrderFilters, format?: 'xlsx' | 'pdf'): Promise<Blob>
}

// ============================================================================
// SERVICIOS DE DOCUMENTOS DE COMPRA
// ============================================================================

export interface PurchaseDocService {
  // CRUD básico
  getDocs(filters?: PurchaseDocFilters): Promise<PaginatedResponse<PurchaseDocListItem>>
  getDoc(id: string): Promise<ApiResponse<PurchaseDoc>>
  createDoc(data: PurchaseDocFormData): Promise<ApiResponse<PurchaseDoc>>
  updateDoc(id: string, data: Partial<PurchaseDocFormData>): Promise<ApiResponse<PurchaseDoc>>
  deleteDoc(id: string): Promise<ApiResponse<void>>
  
  // Acciones específicas
  markAsReceived(id: string): Promise<ApiResponse<void>>
  markAsPartiallyReceived(id: string): Promise<ApiResponse<void>>
  cancelDoc(id: string, reason: string): Promise<ApiResponse<void>>
  
  // Integración con órdenes
  createFromOrder(orderId: string, data: Partial<PurchaseDocFormData>): Promise<ApiResponse<PurchaseDoc>>
  
  // Cálculos
  calculateTaxes(items: PurchaseDocFormData['items'], currency: string): Promise<TaxCalculation>
  
  // Acciones en lote
  bulkAction(action: BulkAction): Promise<BulkActionResult>
}

// ============================================================================
// SERVICIOS DE RECEPCIONES
// ============================================================================

export interface ReceptionService {
  // CRUD básico
  getReceptions(filters?: ReceptionFilters): Promise<PaginatedResponse<ReceptionListItem>>
  getReception(id: string): Promise<ApiResponse<Reception>>
  createReception(data: ReceptionFormData): Promise<ApiResponse<Reception>>
  updateReception(id: string, data: Partial<ReceptionFormData>): Promise<ApiResponse<Reception>>
  deleteReception(id: string): Promise<ApiResponse<void>>
  
  // Acciones específicas
  approveReception(id: string, notes?: string): Promise<ApiResponse<void>>
  rejectReception(id: string, reason: string): Promise<ApiResponse<void>>
  
  // Integración con documentos
  createFromDoc(docId: string, data: Partial<ReceptionFormData>): Promise<ApiResponse<Reception>>
  getByDocument(docId: string): Promise<Reception[]>
  
  // Acciones en lote
  bulkAction(action: BulkAction): Promise<BulkActionResult>
}

// ============================================================================
// SERVICIOS DE INTEGRACIÓN Y ANÁLISIS
// ============================================================================

export interface PurchaseIntegrationService {
  // Coincidencia de tres vías
  performThreeWayMatch(orderId: string, docId?: string, receptionId?: string): Promise<ThreeWayMatchResult>
  
  // Generación automática de documentos
  generateDocFromOrder(orderId: string): Promise<ApiResponse<PurchaseDoc>>
  generateReceptionFromDoc(docId: string): Promise<ApiResponse<Reception>>
  
  // Sincronización de estados
  syncOrderStatus(orderId: string): Promise<ApiResponse<void>>
  syncDocStatus(docId: string): Promise<ApiResponse<void>>
  
  // Validaciones de negocio
  validateOrderApproval(orderId: string): Promise<{ canApprove: boolean; reason?: string }>
  validateDocCreation(data: PurchaseDocFormData): Promise<{ isValid: boolean; errors: string[] }>
  validateReception(data: ReceptionFormData): Promise<{ isValid: boolean; errors: string[] }>
}

export interface PurchaseAnalyticsService {
  // Reportes generales
  getAnalytics(dateFrom: string, dateTo: string): Promise<PurchasesAnalytics>
  
  // Reportes específicos
  getSupplierPerformance(supplierId?: string): Promise<any>
  getInventoryImpact(): Promise<any>
  getCostAnalysis(): Promise<any>
  
  // Exportación de reportes
  exportReport(type: string, filters: any, format: 'xlsx' | 'pdf'): Promise<Blob>
}

// ============================================================================
// SERVICIOS AUXILIARES
// ============================================================================

export interface PurchaseUtilService {
  // Búsquedas auxiliares
  searchSuppliers(query: string): Promise<any[]>
  searchProducts(query: string): Promise<any[]>
  getWarehouses(): Promise<any[]>
  getCurrencies(): Promise<any[]>
  
  // Validaciones SUNAT
  validateDocumentNumber(type: string, series: string, number: string): Promise<boolean>
  getDocumentTypes(): Promise<any[]>
  getIGVAffectations(): Promise<any[]>
  
  // Configuraciones
  getSettings(): Promise<any>
  updateSettings(settings: any): Promise<ApiResponse<void>>
}

// ============================================================================
// TIPOS PARA ESTADOS DE LA APLICACIÓN
// ============================================================================

export interface PurchaseState {
  // Listas
  orders: {
    items: PurchaseOrderListItem[]
    loading: boolean
    error: string | null
    filters: PurchaseOrderFilters
    pagination: {
      page: number
      limit: number
      total: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
  
  docs: {
    items: PurchaseDocListItem[]
    loading: boolean
    error: string | null
    filters: PurchaseDocFilters
    pagination: {
      page: number
      limit: number
      total: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
  
  receptions: {
    items: ReceptionListItem[]
    loading: boolean
    error: string | null
    filters: ReceptionFilters
    pagination: {
      page: number
      limit: number
      total: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
  
  // Elemento actualmente seleccionado
  currentOrder: PurchaseOrder | null
  currentDoc: PurchaseDoc | null
  currentReception: Reception | null
  
  // Estados de carga
  orderLoading: boolean
  docLoading: boolean
  receptionLoading: boolean
  
  // Errores
  orderError: string | null
  docError: string | null
  receptionError: string | null
  
  // Configuraciones
  settings: any
}

// ============================================================================
// HOOKS Y COMPOSABLES
// ============================================================================

export interface UsePurchaseOrdersReturn {
  // Estado
  orders: PurchaseOrderListItem[]
  currentOrder: PurchaseOrder | null
  loading: boolean
  error: string | null
  
  // Acciones
  loadOrders: (filters?: PurchaseOrderFilters) => Promise<void>
  loadOrder: (id: string) => Promise<void>
  createOrder: (data: PurchaseOrderFormData) => Promise<PurchaseOrder>
  updateOrder: (id: string, data: Partial<PurchaseOrderFormData>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  approveOrder: (id: string, notes?: string) => Promise<void>
  rejectOrder: (id: string, reason: string) => Promise<void>
  cancelOrder: (id: string, reason: string) => Promise<void>
  
  // Utilidades
  refreshOrders: () => Promise<void>
  clearError: () => void
}