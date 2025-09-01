import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import { useRealtime } from '@/composables/useRealtime'
import type {
  DashboardMetrics,
  SalesGrowthData,
  InventoryValueData,
  LowStockAlert,
  ExchangeRateData,
  MVSalesAnalysis,
  MVWarehouseStock,
  MVInventoryRevaluation,
  ExchangeRate,
} from '@/types/dashboard'

export const useDashboard = () => {
  const companyStore = useCompanyStore()
  const currentCompanyId = computed(() => companyStore.currentCompany?.id)

  // Sales Analysis Data
  const {
    data: salesAnalysis,
    isLoading: salesAnalysisLoading,
    error: salesAnalysisError,
    refetch: refetchSalesAnalysis,
  } = useQuery({
    queryKey: ['dashboard', 'sales-analysis', currentCompanyId],
    queryFn: async (): Promise<MVSalesAnalysis[]> => {
      if (!currentCompanyId.value) throw new Error('No company selected')

      const { data, error } = await supabase
        .from('mv_sales_analysis')
        .select('*')
        .eq('company_id', currentCompanyId.value)
        .order('month_year', { ascending: false })
        .limit(12)

      if (error) throw error
      return data || []
    },
    enabled: computed(() => !!currentCompanyId.value),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Warehouse Stock Data
  const {
    data: warehouseStock,
    isLoading: warehouseStockLoading,
    error: warehouseStockError,
    refetch: refetchWarehouseStock,
  } = useQuery({
    queryKey: ['dashboard', 'warehouse-stock', currentCompanyId],
    queryFn: async (): Promise<MVWarehouseStock[]> => {
      if (!currentCompanyId.value) throw new Error('No company selected')

      const { data, error } = await supabase
        .from('mv_warehouse_stock')
        .select('*')
        .eq('company_id', currentCompanyId.value)

      if (error) throw error
      return data || []
    },
    enabled: computed(() => !!currentCompanyId.value),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Inventory Revaluation Data
  const {
    data: inventoryRevaluation,
    isLoading: inventoryRevaluationLoading,
    error: inventoryRevaluationError,
    refetch: refetchInventoryRevaluation,
  } = useQuery({
    queryKey: ['dashboard', 'inventory-revaluation', currentCompanyId],
    queryFn: async (): Promise<MVInventoryRevaluation[]> => {
      if (!currentCompanyId.value) throw new Error('No company selected')

      const { data, error } = await supabase
        .from('mv_inventory_revaluation')
        .select('*')
        .eq('company_id', currentCompanyId.value)
        .order('total_unrealized_gain_loss', { ascending: false })
        .limit(100)

      if (error) throw error
      return data || []
    },
    enabled: computed(() => !!currentCompanyId.value),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Exchange Rates Data
  const {
    data: exchangeRates,
    isLoading: exchangeRatesLoading,
    error: exchangeRatesError,
    refetch: refetchExchangeRates,
  } = useQuery({
    queryKey: ['dashboard', 'exchange-rates', currentCompanyId],
    queryFn: async (): Promise<ExchangeRate[]> => {
      /* if (!currentCompanyId.value) throw new Error('No company selected') */

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        /* .eq('company_id', currentCompanyId.value) */
        .order('rate_date', { ascending: false })
        .limit(30)

      if (error) throw error
      return data || []
    },
    enabled: computed(() => !!currentCompanyId.value),
    staleTime: 15 * 60 * 1000, // 15 minutes
  })

  // Calculate Exchange Rate Difference using RPC
  const {
    data: exchangeRateDifference,
    isLoading: exchangeRateDifferenceLoading,
    error: exchangeRateDifferenceError,
    refetch: refetchExchangeRateDifference,
  } = useQuery({
    queryKey: ['dashboard', 'exchange-rate-difference', currentCompanyId],
    queryFn: async (): Promise<number> => {
      if (!currentCompanyId.value) throw new Error('No company selected')

      const { data, error } = await supabase.rpc('calculate_exchange_rate_difference', {
        p_company_id: currentCompanyId.value,
      })

      if (error) throw error
      return data || 0
    },
    enabled: computed(() => !!currentCompanyId.value),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })

  // Computed dashboard metrics
  const dashboardMetrics = computed((): DashboardMetrics => {
    const latestSales = salesAnalysis.value?.[0]
    const previousSales = salesAnalysis.value?.[1]

    const totalInventoryValue =
      warehouseStock.value?.reduce((sum, item) => sum + item.total_value, 0) || 0

    const lowStockCount =
      warehouseStock.value?.filter((item) => item.current_qty <= item.min_stock).length || 0

    return {
      totalSales: latestSales?.total_sales || 0,
      totalSalesGrowth: latestSales?.growth_rate || 0,
      inventoryValue: totalInventoryValue,
      inventoryValueGrowth: 0, // Calculate based on historical data
      lowStockItems: lowStockCount,
      exchangeRateDifference:
        typeof exchangeRateDifference.value === 'number'
          ? exchangeRateDifference.value
          : Array.isArray(exchangeRateDifference.value)
            ? (exchangeRateDifference.value[0] as number) || 0
            : 0,
    }
  })

  // Sales growth chart data
  const salesGrowthData = computed((): SalesGrowthData[] => {
    return (
      salesAnalysis.value?.map((item) => ({
        period: item.period,
        sales: item.total_sales,
        growth: item.growth_rate,
      })) || []
    )
  })

  // Inventory value by warehouse
  const inventoryValueData = computed((): InventoryValueData[] => {
    const warehouseMap = new Map<string, InventoryValueData>()

    warehouseStock.value?.forEach((item) => {
      const existing = warehouseMap.get(item.warehouse_id)
      if (existing) {
        existing.totalValue += item.total_value
        existing.totalItems += 1
      } else {
        warehouseMap.set(item.warehouse_id, {
          warehouseId: item.warehouse_id,
          warehouseName: item.warehouse_name,
          totalValue: item.total_value,
          totalItems: 1,
        })
      }
    })

    return Array.from(warehouseMap.values())
  })

  // Low stock alerts
  const lowStockAlerts = computed((): LowStockAlert[] => {
    return (
      warehouseStock.value
        ?.filter((item) => item.current_qty <= item.min_stock)
        .map((item) => {
          const stockRatio = item.current_qty / item.min_stock
          let urgencyLevel: LowStockAlert['urgencyLevel'] = 'LOW'

          if (stockRatio <= 0) urgencyLevel = 'CRITICAL'
          else if (stockRatio <= 0.25) urgencyLevel = 'HIGH'
          else if (stockRatio <= 0.5) urgencyLevel = 'MEDIUM'

          return {
            productId: item.product_id,
            productName: item.product_name,
            sku: item.sku,
            currentStock: item.current_qty,
            minStock: item.min_stock,
            warehouseName: item.warehouse_name,
            urgencyLevel,
          }
        })
        .sort((a, b) => {
          const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
          return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
        }) || []
    )
  })

  // Exchange rate data for visualization
  const exchangeRateData = computed((): ExchangeRateData[] => {
    const rateMap = new Map<string, ExchangeRate[]>()

    exchangeRates.value?.forEach((rate) => {
      const existing = rateMap.get(rate.currency_code) || []
      existing.push(rate)
      rateMap.set(rate.currency_code, existing)
    })

    return Array.from(rateMap.entries()).map(([currencyCode, rates]) => {
      const sortedRates = rates.sort(
        (a, b) => new Date(b.rate_date).getTime() - new Date(a.rate_date).getTime(),
      )

      const current = sortedRates[0]
      const previous = sortedRates[1]

      const difference = previous ? current.rate - previous.rate : 0
      const differencePercentage = previous ? (difference / previous.rate) * 100 : 0

      return {
        currencyCode,
        currentRate: current.rate,
        previousRate: previous?.rate || 0,
        difference,
        differencePercentage,
        impactAmount: 0, // Calculate based on inventory value
      }
    })
  })

  // Refresh all materialized views
  const refreshMaterializedViews = async () => {
    if (!currentCompanyId.value) return

    try {
      const { error } = await supabase.rpc('refresh_all_materialized_views')

      if (error) throw error

      // Refetch all dashboard data
      await Promise.all([
        refetchSalesAnalysis(),
        refetchWarehouseStock(),
        refetchInventoryRevaluation(),
        refetchExchangeRates(),
        refetchExchangeRateDifference(),
      ])
    } catch (error) {
      console.error('Error refreshing materialized views:', error)
      throw error
    }
  }

  // Set up real-time subscriptions for warehouse stock
  // Note: Real-time subscriptions will be implemented when useRealtime is fixed
  // useRealtime({
  //   table: 'warehouse_stock',
  //   filter: `company_id=eq.${currentCompanyId.value}`,
  //   onUpdate: () => {
  //     refetchWarehouseStock()
  //   },
  //   enabled: computed(() => !!currentCompanyId.value),
  // })

  return {
    // Data
    salesAnalysis,
    warehouseStock,
    inventoryRevaluation,
    exchangeRates,
    exchangeRateDifference,

    // Loading states
    salesAnalysisLoading,
    warehouseStockLoading,
    inventoryRevaluationLoading,
    exchangeRatesLoading,
    exchangeRateDifferenceLoading,

    // Errors
    salesAnalysisError,
    warehouseStockError,
    inventoryRevaluationError,
    exchangeRatesError,
    exchangeRateDifferenceError,

    // Computed data
    dashboardMetrics,
    salesGrowthData,
    inventoryValueData,
    lowStockAlerts,
    exchangeRateData,

    // Actions
    refreshMaterializedViews,
    refetchSalesAnalysis,
    refetchWarehouseStock,
    refetchInventoryRevaluation,
    refetchExchangeRates,
    refetchExchangeRateDifference,
  }
}
