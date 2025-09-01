import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDashboard } from '../useDashboard'
import { useCompanyStore } from '@/stores/company'
import { createPinia, setActivePinia } from 'pinia'

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: 0, error: null })),
  },
}))

// Mock TanStack Query
vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(() => ({
    data: { value: [] },
    isLoading: { value: false },
    error: { value: null },
    refetch: vi.fn(),
  })),
}))

// Mock useRealtime
vi.mock('@/composables/useRealtime', () => ({
  useRealtime: vi.fn(),
}))

describe('useDashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    // Mock company store
    const companyStore = useCompanyStore()
    companyStore.currentCompany = {
      id: 'test-company-id',
      ruc: '12345678901',
      legal_name: 'Test Company',
      currency_code: 'PEN',
      valuation_method: 'PROMEDIO_MOVIL',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
  })

  it('should initialize dashboard composable', () => {
    const dashboard = useDashboard()

    expect(dashboard).toBeDefined()
    expect(dashboard.dashboardMetrics).toBeDefined()
    expect(dashboard.salesGrowthData).toBeDefined()
    expect(dashboard.inventoryValueData).toBeDefined()
    expect(dashboard.lowStockAlerts).toBeDefined()
    expect(dashboard.exchangeRateData).toBeDefined()
  })

  it('should provide refetch methods', () => {
    const dashboard = useDashboard()

    expect(typeof dashboard.refetchSalesAnalysis).toBe('function')
    expect(typeof dashboard.refetchWarehouseStock).toBe('function')
    expect(typeof dashboard.refetchInventoryRevaluation).toBe('function')
    expect(typeof dashboard.refetchExchangeRates).toBe('function')
    expect(typeof dashboard.refetchExchangeRateDifference).toBe('function')
  })

  it('should provide refresh materialized views method', () => {
    const dashboard = useDashboard()

    expect(typeof dashboard.refreshMaterializedViews).toBe('function')
  })

  it('should calculate dashboard metrics correctly', () => {
    const dashboard = useDashboard()

    const metrics = dashboard.dashboardMetrics.value

    expect(metrics).toHaveProperty('totalSales')
    expect(metrics).toHaveProperty('totalSalesGrowth')
    expect(metrics).toHaveProperty('inventoryValue')
    expect(metrics).toHaveProperty('inventoryValueGrowth')
    expect(metrics).toHaveProperty('lowStockItems')
    expect(metrics).toHaveProperty('exchangeRateDifference')
  })
})
