import { ref, computed, watch } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import { useRealtime } from './useRealtime'
import type {
  Warehouse,
  WarehouseZone,
  StorageLocation,
  WarehouseStock,
  WarehouseStockLocation,
} from '@/types/database'

export interface Warehouse3DFilters {
  warehouseId?: string
  showEmptyZones?: boolean
  stockStatus?: 'ALL' | 'LOW_STOCK' | 'OVERSTOCK' | 'NORMAL'
}

export interface WarehouseZone3DType extends WarehouseZone {
  stockLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EMPTY'
  currentStock: number
  maxCapacity: number
  utilizationPercentage: number
}

export interface StorageLocation3DType extends StorageLocation {
  products: WarehouseStockLocation[]
  stockLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EMPTY'
  utilizationPercentage: number
}

export interface Warehouse3DData {
  warehouse: Warehouse
  zones: WarehouseZone3D[]
  locations: StorageLocation3D[]
  totalStock: number
  totalCapacity: number
  utilizationPercentage: number
}

export const useWarehouse3D = (filters: Warehouse3DFilters = {}) => {
  const { createSelectQuery, createRpcQuery } = useSupabaseQuery()

  // Reactive filters
  const currentFilters = ref(filters)

  // Selected warehouse for 3D visualization
  const selectedWarehouseId = ref<string | null>(currentFilters.value.warehouseId || null)

  // Query for warehouses
  const {
    data: warehouses,
    isLoading: isLoadingWarehouses,
    error: warehousesError,
  } = createSelectQuery<Warehouse>(
    'warehouses',
    `
      *,
      company:company_id(id, legal_name)
    `,
    computed(() => ({ is_active: true })),
  )

  // Query for warehouse zones with coordinates
  const {
    data: warehouseZones,
    isLoading: isLoadingZones,
    error: zonesError,
    refetch: refetchZones,
  } = createSelectQuery<WarehouseZone>(
    'warehouse_zones',
    '*',
    computed(() =>
      selectedWarehouseId.value
        ? { warehouse_id: selectedWarehouseId.value }
        : { warehouse_id: 'null' },
    ),
    {
      enabled: computed(() => !!selectedWarehouseId.value),
      staleTime: 5 * 60 * 1000,
    },
  )

  // Query for storage locations
  const {
    data: storageLocations,
    isLoading: isLoadingLocations,
    error: locationsError,
    refetch: refetchLocations,
  } = createSelectQuery<StorageLocation>(
    'storage_locations',
    '*',
    computed(() =>
      selectedWarehouseId.value
        ? { warehouse_id: selectedWarehouseId.value, is_active: true }
        : { warehouse_id: 'null' },
    ),
    {
      enabled: computed(() => !!selectedWarehouseId.value),
      staleTime: 5 * 60 * 1000,
    },
  )

  // Query for warehouse stock levels
  const {
    data: warehouseStock,
    isLoading: isLoadingStock,
    error: stockError,
    refetch: refetchStock,
  } = createSelectQuery<WarehouseStock>(
    'warehouse_stock',
    `
      *,
      product:product_id(
        id,
        sku,
        name,
        min_stock,
        max_stock,
        unit_code
      )
    `,
    computed(() =>
      selectedWarehouseId.value
        ? { warehouse_id: selectedWarehouseId.value }
        : { warehouse_id: 'null' },
    ),
    {
      enabled: computed(() => !!selectedWarehouseId.value),
      staleTime: 2 * 60 * 1000,
    },
  )

  // Query for detailed stock locations
  const {
    data: stockLocations,
    isLoading: isLoadingStockLocations,
    error: stockLocationsError,
    refetch: refetchStockLocations,
  } = createSelectQuery<WarehouseStockLocation>(
    'warehouse_stock_location',
    `
      *,
      product:product_id(
        id,
        sku,
        name,
        min_stock,
        max_stock,
        unit_code
      ),
      location:location_id(
        id,
        code,
        name,
        coordinates
      )
    `,
    computed(() =>
      selectedWarehouseId.value
        ? { warehouse_id: selectedWarehouseId.value }
        : { warehouse_id: 'null' },
    ),
    {
      enabled: computed(() => !!selectedWarehouseId.value),
      staleTime: 2 * 60 * 1000,
    },
  )

  // Helper function to calculate stock level
  const calculateStockLevel = (
    currentStock: number,
    minStock: number,
    maxStock: number,
  ): 'LOW' | 'NORMAL' | 'HIGH' | 'EMPTY' => {
    if (currentStock === 0) return 'EMPTY'
    if (currentStock <= minStock) return 'LOW'
    if (maxStock > 0 && currentStock >= maxStock * 0.9) return 'HIGH'
    return 'NORMAL'
  }

  // Helper function to get stock color
  const getStockLevelColor = (
    level: 'LOW' | 'NORMAL' | 'HIGH' | 'EMPTY',
    isDark = false,
  ): string => {
    const colors = {
      EMPTY: isDark ? '#374151' : '#F3F4F6', // gray-700 / gray-100
      LOW: isDark ? '#DC2626' : '#FEE2E2', // red-600 / red-100
      NORMAL: isDark ? '#059669' : '#D1FAE5', // emerald-600 / emerald-100
      HIGH: isDark ? '#D97706' : '#FEF3C7', // amber-600 / amber-100
    }
    return colors[level]
  }

  // Process warehouse zones with stock data
  const processedZones = computed<WarehouseZone3D[]>(() => {
    if (!warehouseZones.value || !warehouseStock.value) return []

    return warehouseZones.value.map((zone) => {
      // Calculate stock in this zone
      const zoneStock = stockLocations.value?.filter((sl) => sl.zone_id === zone.id) || []

      const currentStock = zoneStock.reduce((sum, sl) => sum + sl.current_qty, 0)
      const maxCapacity = zone.capacity_kg || 1000
      const utilizationPercentage = maxCapacity > 0 ? (currentStock / maxCapacity) * 100 : 0

      // Determine average stock level for the zone
      const stockLevels = zoneStock.map((sl) => {
        const product = (sl as any).product
        return calculateStockLevel(
          sl.current_qty,
          product?.min_stock || 0,
          product?.max_stock || 1000,
        )
      })

      let stockLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EMPTY' = 'EMPTY'
      if (stockLevels.length > 0) {
        const lowCount = stockLevels.filter((l) => l === 'LOW').length
        const highCount = stockLevels.filter((l) => l === 'HIGH').length
        const normalCount = stockLevels.filter((l) => l === 'NORMAL').length

        if (lowCount > stockLevels.length / 2) stockLevel = 'LOW'
        else if (highCount > stockLevels.length / 2) stockLevel = 'HIGH'
        else if (normalCount > 0) stockLevel = 'NORMAL'
      }

      return {
        ...zone,
        stockLevel,
        currentStock,
        maxCapacity,
        utilizationPercentage,
      }
    })
  })

  // Process storage locations with stock data
  const processedLocations = computed<StorageLocation3D[]>(() => {
    if (!storageLocations.value || !stockLocations.value) return []

    return storageLocations.value.map((location) => {
      const locationStock =
        stockLocations.value?.filter((sl) => sl.location_id === location.id) || []

      const totalStock = locationStock.reduce((sum, sl) => sum + sl.current_qty, 0)
      const maxCapacity = location.max_capacity_kg || 100
      const utilizationPercentage = maxCapacity > 0 ? (totalStock / maxCapacity) * 100 : 0

      // Determine overall stock level for location
      let stockLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EMPTY' = 'EMPTY'
      if (locationStock.length > 0) {
        const avgMinStock =
          locationStock.reduce((sum, sl) => sum + ((sl as any).product?.min_stock || 0), 0) /
          locationStock.length
        const avgMaxStock =
          locationStock.reduce((sum, sl) => sum + ((sl as any).product?.max_stock || 100), 0) /
          locationStock.length

        stockLevel = calculateStockLevel(totalStock, avgMinStock, avgMaxStock)
      }

      return {
        ...location,
        products: locationStock,
        stockLevel,
        utilizationPercentage,
      }
    })
  })

  // Get selected warehouse data
  const selectedWarehouse = computed<Warehouse | null>(() => {
    if (!selectedWarehouseId.value || !warehouses.value) return null
    return warehouses.value.find((w) => w.id === selectedWarehouseId.value) || null
  })

  // Complete 3D warehouse data
  const warehouse3DData = computed<Warehouse3DData | null>(() => {
    if (!selectedWarehouse.value) return null

    const zones = processedZones.value
    const locations = processedLocations.value

    const totalStock = zones.reduce((sum, zone) => sum + zone.currentStock, 0)
    const totalCapacity = zones.reduce((sum, zone) => sum + zone.maxCapacity, 0)
    const utilizationPercentage = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 0

    return {
      warehouse: selectedWarehouse.value,
      zones,
      locations,
      totalStock,
      totalCapacity,
      utilizationPercentage,
    }
  })

  // Real-time subscriptions
  const { subscribeToTable } = useRealtime()

  // Watch for warehouse selection changes
  watch(
    selectedWarehouseId,
    (newWarehouseId) => {
      if (newWarehouseId) {
        // Subscribe to real-time updates for the selected warehouse
        subscribeToTable('warehouse_stock', {
          filter: `warehouse_id=eq.${newWarehouseId}`,
          onUpdate: () => {
            refetchStock()
            refetchStockLocations()
          },
        })

        subscribeToTable('warehouse_stock_location', {
          filter: `warehouse_id=eq.${newWarehouseId}`,
          onUpdate: () => {
            refetchStockLocations()
          },
        })
      }
    },
    { immediate: true },
  )

  // Helper functions
  const updateFilters = (newFilters: Partial<Warehouse3DFilters>) => {
    currentFilters.value = { ...currentFilters.value, ...newFilters }
    if (newFilters.warehouseId !== undefined) {
      selectedWarehouseId.value = newFilters.warehouseId || null
    }
  }

  const selectWarehouse = (warehouseId: string) => {
    selectedWarehouseId.value = warehouseId
    currentFilters.value.warehouseId = warehouseId
  }

  const getZoneColor = (zone: WarehouseZone3D, isDark = false): string => {
    return zone.color_hex || getStockLevelColor(zone.stockLevel, isDark)
  }

  const getLocationColor = (location: StorageLocation3D, isDark = false): string => {
    return getStockLevelColor(location.stockLevel, isDark)
  }

  // Loading states
  const isLoading = computed(
    () =>
      isLoadingWarehouses.value ||
      isLoadingZones.value ||
      isLoadingLocations.value ||
      isLoadingStock.value ||
      isLoadingStockLocations.value,
  )

  const error = computed(
    () =>
      warehousesError.value ||
      zonesError.value ||
      locationsError.value ||
      stockError.value ||
      stockLocationsError.value,
  )

  return {
    // Data
    warehouses,
    warehouse3DData,
    selectedWarehouse,
    processedZones,
    processedLocations,
    warehouseStock,
    stockLocations,

    // State
    selectedWarehouseId,
    currentFilters,
    isLoading,
    error,

    // Actions
    updateFilters,
    selectWarehouse,
    refetchZones,
    refetchLocations,
    refetchStock,
    refetchStockLocations,

    // Helpers
    getZoneColor,
    getLocationColor,
    getStockLevelColor,
    calculateStockLevel,
  }
}
