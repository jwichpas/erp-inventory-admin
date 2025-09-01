import { computed, ref } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import type { StockLedgerEntry, Warehouse, WarehouseZone, StorageLocation } from '@/types/database'
import type { StockMovementFormData } from '@/schemas/productSchemas'

export interface StockMovementFilters {
  productId?: string
  warehouseId?: string
  movementType?: 'IN' | 'OUT' | 'TRANSFER'
  dateFrom?: string
  dateTo?: string
}

export const useStockMovements = (filters: StockMovementFilters = {}) => {
  const { createSelectQuery, createInsertMutation, queryClient } = useSupabaseQuery()

  // Reactive filters
  const currentFilters = ref(filters)

  // Create filters computed
  const queryFilters = computed(() => {
    const filters: any = { ...currentFilters.value }
    if (filters.productId) {
      filters.product_id = `eq.${filters.productId}`
      delete filters.productId
    }
    if (filters.warehouseId) {
      filters.warehouse_id = `eq.${filters.warehouseId}`
      delete filters.warehouseId
    }
    if (filters.movementType) {
      // Determine movement type based on qty_in/qty_out
      if (filters.movementType === 'IN') {
        filters.qty_in = 'gt.0'
      } else if (filters.movementType === 'OUT') {
        filters.qty_out = 'gt.0'
      }
      delete filters.movementType
    }
    if (filters.dateFrom) {
      filters.movement_date = `gte.${filters.dateFrom}`
      delete filters.dateFrom
    }
    if (filters.dateTo) {
      filters.movement_date = `lte.${filters.dateTo}`
      delete filters.dateTo
    }
    return filters
  })

  // Query for stock movements (without JOINs due to missing FK constraints)
  const {
    data: stockMovements,
    isLoading,
    error,
    refetch,
  } = createSelectQuery<StockLedgerEntry>(
    'stock_ledger',
    '*',
    queryFilters,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  )

  // Query for warehouses
  const { data: warehouses, isLoading: isLoadingWarehouses } = createSelectQuery<Warehouse>(
    'warehouses',
    'id, code, name',
    { is_active: true },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    },
  )

  // Query for warehouse zones
  const getWarehouseZones = (warehouseId: string) => {
    return createSelectQuery<WarehouseZone>(
      'warehouse_zones',
      'id, code, name',
      { warehouse_id: warehouseId },
      {
        enabled: computed(() => !!warehouseId),
        staleTime: 10 * 60 * 1000,
      },
    )
  }

  // Query for storage locations
  const getStorageLocations = (warehouseId: string, zoneId?: string) => {
    const filters: any = { warehouse_id: warehouseId, is_active: true }
    if (zoneId) {
      filters.zone_id = zoneId
    }

    return createSelectQuery<StorageLocation>('storage_locations', 'id, code, name', filters, {
      enabled: computed(() => !!warehouseId),
      staleTime: 10 * 60 * 1000,
    })
  }

  // Create stock movement mutation
  const createStockMovementMutation = createInsertMutation<StockLedgerEntry>('stock_ledger', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_ledger'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse_stock'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse_stock_location'] })
    },
  })

  // Helper functions
  const updateFilters = (newFilters: Partial<StockMovementFilters>) => {
    currentFilters.value = { ...currentFilters.value, ...newFilters }
  }

  const clearFilters = () => {
    currentFilters.value = {}
  }

  const createStockMovement = async (movementData: StockMovementFormData) => {
    // Transform the data to match the database schema
    const stockLedgerData = {
      product_id: movementData.product_id,
      warehouse_id: movementData.warehouse_id,
      zone_id: movementData.zone_id,
      location_id: movementData.location_id,
      movement_date: new Date().toISOString(),
      qty_in: movementData.movement_type === 'IN' ? movementData.quantity : 0,
      qty_out: movementData.movement_type === 'OUT' ? movementData.quantity : 0,
      unit_cost_in: movementData.movement_type === 'IN' ? movementData.unit_cost : null,
      unit_cost_out: movementData.movement_type === 'OUT' ? movementData.unit_cost : null,
      reference: movementData.reference,
      document_type: movementData.document_type,
      document_id: movementData.document_id,
    }

    return createStockMovementMutation.mutateAsync(stockLedgerData)
  }

  // Get stock movements for a specific product (without JOINs)
  const getProductStockMovements = (productId: string) => {
    return createSelectQuery<StockLedgerEntry>(
      'stock_ledger',
      '*',
      { product_id: productId },
      {
        enabled: computed(() => !!productId),
        staleTime: 2 * 60 * 1000,
      },
    )
  }

  // Computed properties
  const isCreating = computed(() => createStockMovementMutation.isPending.value)

  // Helper functions to get related data
  const getWarehouse = (warehouseId: string) => {
    return warehouses.value?.find((w) => w.id === warehouseId)
  }

  // Format movement data for display
  const formattedMovements = computed(() => {
    if (!stockMovements.value) return []

    return stockMovements.value.map((movement) => ({
      ...movement,
      movementType: movement.qty_in > 0 ? 'IN' : 'OUT',
      quantity: movement.qty_in > 0 ? movement.qty_in : movement.qty_out,
      unitCost: movement.qty_in > 0 ? movement.unit_cost_in : movement.unit_cost_out,
      // Add warehouse info if available
      warehouse: getWarehouse(movement.warehouse_id),
    }))
  })

  return {
    // Data
    stockMovements,
    formattedMovements,
    warehouses,
    isLoading,
    isLoadingWarehouses,
    error,

    // Filters
    currentFilters,
    updateFilters,
    clearFilters,

    // Actions
    refetch,
    createStockMovement,
    getWarehouseZones,
    getStorageLocations,
    getProductStockMovements,

    // Helper functions
    getWarehouse,

    // Mutation states
    isCreating,

    // Raw mutations
    createStockMovementMutation,
  }
}
