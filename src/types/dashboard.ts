// Dashboard specific types

export interface DashboardMetrics {
  totalSales: number
  totalSalesGrowth: number
  inventoryValue: number
  inventoryValueGrowth: number
  lowStockItems: number
  exchangeRateDifference: number
}

export interface SalesGrowthData {
  period: string
  sales: number
  growth: number
}

export interface InventoryValueData {
  warehouseId: string
  warehouseName: string
  totalValue: number
  totalItems: number
}

export interface LowStockAlert {
  productId: string
  productName: string
  sku: string
  currentStock: number
  minStock: number
  warehouseName: string
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface ExchangeRateData {
  currencyCode: string
  currentRate: number
  previousRate: number
  difference: number
  differencePercentage: number
  impactAmount: number
}

// Materialized view types for dashboard
export interface MVSalesAnalysis {
  company_id: string
  period: string
  total_sales: number
  total_documents: number
  avg_ticket: number
  growth_rate: number
  created_at: string
}

export interface MVWarehouseStock {
  company_id: string
  warehouse_id: string
  warehouse_name: string
  product_id: string
  product_name: string
  sku: string
  current_qty: number
  min_stock: number
  total_value: number
  last_movement_date: string
  updated_at: string
}

export interface MVInventoryRevaluation {
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

export interface ExchangeRate {
  id: string
  company_id: string
  currency_code: string
  rate: number
  rate_date: string
  created_at: string
}
