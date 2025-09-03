// Enumeraciones basadas en el esquema SQL

// Estados de Órdenes de Compra
export const PurchaseOrderStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED', 
  REJECTED: 'REJECTED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED'
} as const

export type PurchaseOrderStatusType = typeof PurchaseOrderStatus[keyof typeof PurchaseOrderStatus]

// Estados de Documentos de Compra
export const PurchaseDocStatus = {
  PENDING: 'PENDING',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED'
} as const

export type PurchaseDocStatusType = typeof PurchaseDocStatus[keyof typeof PurchaseDocStatus]

// Estados de Recepciones
export const ReceptionStatus = {
  PARTIAL: 'PARTIAL',
  COMPLETE: 'COMPLETE',
  REJECTED: 'REJECTED'
} as const

export type ReceptionStatusType = typeof ReceptionStatus[keyof typeof ReceptionStatus]

// Tipos de Operación SUNAT
export const OperationType = {
  PURCHASE: '01',
  IMPORT: '02',
  CONSIGNMENT: '03',
  DONATION: '04',
  TRANSFER: '05'
} as const

export type OperationTypeType = typeof OperationType[keyof typeof OperationType]

// Códigos de Moneda más comunes
export const CurrencyCode = {
  PEN: 'PEN',
  USD: 'USD',
  EUR: 'EUR'
} as const

export type CurrencyCodeType = typeof CurrencyCode[keyof typeof CurrencyCode]

// Tipos de Documento SUNAT más comunes para compras
export const DocumentType = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
  RECIBO_HONORARIOS: '11',
  TICKET: '12',
  DOCUMENTO_RETENCION: '20',
  COMPROBANTE_NO_DOMICILIADO: '91'
} as const

export type DocumentTypeType = typeof DocumentType[keyof typeof DocumentType]

// Códigos de Afectación IGV más comunes
export const IGVAffectation = {
  GRAVADO_OPERACION_ONEROSA: '10',
  GRAVADO_RETIRO: '11',
  GRAVADO_RETIRO_PREMIO: '12',
  GRAVADO_BONIFICACION: '13',
  EXONERADO_OPERACION_ONEROSA: '20',
  INAFECTO_OPERACION_ONEROSA: '30',
  INAFECTO_RETIRO: '31',
  INAFECTO_RETIRO_PREMIO: '32',
  INAFECTO_BONIFICACION: '33',
  EXPORTACION: '40'
} as const

export type IGVAffectationType = typeof IGVAffectation[keyof typeof IGVAffectation]

// Labels para mostrar en la interfaz
export const StatusLabels = {
  // Órdenes de Compra
  [PurchaseOrderStatus.PENDING]: 'Pendiente',
  [PurchaseOrderStatus.APPROVED]: 'Aprobada',
  [PurchaseOrderStatus.REJECTED]: 'Rechazada',
  [PurchaseOrderStatus.RECEIVED]: 'Recibida',
  [PurchaseOrderStatus.CANCELLED]: 'Cancelada',
  
  // Documentos de Compra
  [PurchaseDocStatus.PENDING]: 'Pendiente',
  [PurchaseDocStatus.PARTIALLY_RECEIVED]: 'Parcialmente Recibido',
  [PurchaseDocStatus.RECEIVED]: 'Recibido',
  [PurchaseDocStatus.CANCELLED]: 'Cancelado',
  
  // Recepciones
  [ReceptionStatus.PARTIAL]: 'Parcial',
  [ReceptionStatus.COMPLETE]: 'Completo',
  [ReceptionStatus.REJECTED]: 'Rechazado'
} as const

// Clases CSS para estados
export const StatusColors = {
  // Órdenes de Compra
  [PurchaseOrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [PurchaseOrderStatus.APPROVED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [PurchaseOrderStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [PurchaseOrderStatus.RECEIVED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [PurchaseOrderStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  
  // Documentos de Compra
  [PurchaseDocStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [PurchaseDocStatus.PARTIALLY_RECEIVED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [PurchaseDocStatus.RECEIVED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [PurchaseDocStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  
  // Recepciones
  [ReceptionStatus.PARTIAL]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [ReceptionStatus.COMPLETE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [ReceptionStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
} as const