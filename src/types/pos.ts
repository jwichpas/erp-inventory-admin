export interface POSProduct {
  id: string
  sku: string
  name: string
  brandName?: string
  categoryName?: string
  unitCode: string
  unitName?: string
  currentPrice: number
  availableStock: number
  minStock: number
  isSerialized: boolean
  taxRate: number
  imageUrl?: string
}

export interface POSCustomer {
  id: string
  documentType: string
  documentNumber: string
  name: string
  email?: string
  phone?: string
  address?: string
  isFrequent: boolean
}

export interface POSCartItem {
  productId: string
  sku: string
  name: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  subtotal: number
  total: number
  availableStock: number
}

export interface POSPayment {
  type: 'CASH' | 'CARD' | 'TRANSFER'
  amount: number
  reference?: string
  cardType?: string
  authCode?: string
}

export interface POSSession {
  id?: string
  userId: string
  companyId: string
  warehouseId: string
  openedAt: Date
  closedAt?: Date
  openingAmount: number
  closingAmount?: number
  expectedAmount?: number
  difference?: number
  totalSales: number
  totalTransactions: number
  status: 'OPEN' | 'CLOSED'
  notes?: string
}

export interface POSSale {
  id?: string
  sessionId: string
  customerId: string
  docType: string
  series: string
  number: string
  saleDate: Date
  items: POSCartItem[]
  payments: POSPayment[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  status: 'COMPLETED' | 'CANCELLED'
  notes?: string
}

// Response from SQL process_pos_sale function
export interface POSSaleResult {
  success: boolean
  error?: string
  sales_doc_id?: string
  document_number?: string
  total?: number
  stock_validation?: any
}

export interface POSStats {
  todaySales: number
  todayTransactions: number
  averageTicket: number
  topProducts: Array<{
    productId: string
    name: string
    quantity: number
    revenue: number
  }>
  paymentMethodBreakdown: Array<{
    method: string
    amount: number
    percentage: number
  }>
}

export interface ReceiptData {
  sale: POSSale
  customer: POSCustomer
  company: {
    name: string
    ruc: string
    address: string
    phone?: string
  }
  qrCode?: string
}
