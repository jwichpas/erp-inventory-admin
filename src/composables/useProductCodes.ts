import { computed, ref } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import type { ProductCodeFormData } from '@/schemas/productSchemas'

export interface ProductCode {
  id: string
  company_id: string
  product_id: string
  code: string
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'DAMAGED'
  warehouse_id: string
  zone_id?: string
  location_id?: string
  purchase_date?: string
  sale_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProductCodeFilters {
  productId?: string
  warehouseId?: string
  status?: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'DAMAGED'
  search?: string
}

export const useProductCodes = (filters: ProductCodeFilters = {}) => {
  const {
    createSelectQuery,
    createInsertMutation,
    createUpdateMutation,
    createDeleteMutation,
    queryClient,
  } = useSupabaseQuery()

  // Reactive filters
  const currentFilters = ref(filters)

  // Query for product codes
  const {
    data: productCodes,
    isLoading,
    error,
    refetch,
  } = createSelectQuery<ProductCode>(
    'product_codes',
    `
      *,
      products:product_id(id, sku, name),
      warehouses:warehouse_id(id, code, name),
      warehouse_zones:zone_id(id, code, name),
      storage_locations:location_id(id, code, name)
    `,
    computed(() => {
      const filters: any = { ...currentFilters.value }
      if (filters.productId) {
        filters.product_id = `eq.${filters.productId}`
        delete filters.productId
      }
      if (filters.warehouseId) {
        filters.warehouse_id = `eq.${filters.warehouseId}`
        delete filters.warehouseId
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filters.code = `ilike.%${searchTerm}%`
        delete filters.search
      }
      if (filters.status) {
        filters.status = `eq.${filters.status}`
      }
      return filters
    }),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    },
  )

  // Get single product code
  const getProductCode = (id: string) => {
    return createSelectQuery<ProductCode>(
      'product_codes',
      `
        *,
        products:product_id(id, sku, name),
        warehouses:warehouse_id(id, code, name),
        warehouse_zones:zone_id(id, code, name),
        storage_locations:location_id(id, code, name)
      `,
      { id },
      {
        enabled: computed(() => !!id),
      },
    )
  }

  // Create product code mutation
  const createProductCodeMutation = createInsertMutation<ProductCode>('product_codes', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_codes'] })
    },
  })

  // Update product code mutation
  const updateProductCodeMutation = createUpdateMutation<ProductCode>('product_codes', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_codes'] })
    },
  })

  // Delete product code mutation
  const deleteProductCodeMutation = createDeleteMutation('product_codes', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product_codes'] })
    },
  })

  // Helper functions
  const updateFilters = (newFilters: Partial<ProductCodeFilters>) => {
    currentFilters.value = { ...currentFilters.value, ...newFilters }
  }

  const clearFilters = () => {
    currentFilters.value = {}
  }

  const createProductCode = async (codeData: ProductCodeFormData) => {
    return createProductCodeMutation.mutateAsync(codeData)
  }

  const updateProductCode = async (id: string, codeData: Partial<ProductCode>) => {
    return updateProductCodeMutation.mutateAsync({ id, data: codeData })
  }

  const deleteProductCode = async (id: string) => {
    return deleteProductCodeMutation.mutateAsync(id)
  }

  // Bulk create product codes
  const createBulkProductCodes = async (codes: ProductCodeFormData[]) => {
    const promises = codes.map((code) => createProductCode(code))
    return Promise.all(promises)
  }

  // Update product code status (common operation)
  const updateProductCodeStatus = async (id: string, status: ProductCode['status']) => {
    const updateData: Partial<ProductCode> = { status }

    if (status === 'SOLD') {
      updateData.sale_date = new Date().toISOString()
    }

    return updateProductCode(id, updateData)
  }

  // Get available codes for a product
  const getAvailableProductCodes = (productId: string) => {
    return createSelectQuery<ProductCode>(
      'product_codes',
      `
        *,
        warehouses:warehouse_id(id, code, name),
        warehouse_zones:zone_id(id, code, name),
        storage_locations:location_id(id, code, name)
      `,
      {
        product_id: productId,
        status: 'AVAILABLE',
      },
      {
        enabled: computed(() => !!productId),
        staleTime: 1 * 60 * 1000, // 1 minute
      },
    )
  }

  // Computed properties
  const isCreating = computed(() => createProductCodeMutation.isPending)
  const isUpdating = computed(() => updateProductCodeMutation.isPending)
  const isDeleting = computed(() => deleteProductCodeMutation.isPending)
  const isMutating = computed(() => isCreating.value || isUpdating.value || isDeleting.value)

  // Status options for dropdowns
  const statusOptions = [
    { value: 'AVAILABLE', label: 'Disponible' },
    { value: 'SOLD', label: 'Vendido' },
    { value: 'RESERVED', label: 'Reservado' },
    { value: 'DAMAGED', label: 'Dañado' },
  ]

  // Get status label
  const getStatusLabel = (status: ProductCode['status']) => {
    return statusOptions.find((option) => option.value === status)?.label || status
  }

  // Get status color for UI
  const getStatusColor = (status: ProductCode['status']) => {
    const colors = {
      AVAILABLE: 'green',
      SOLD: 'blue',
      RESERVED: 'yellow',
      DAMAGED: 'red',
    }
    return colors[status] || 'gray'
  }

  return {
    // Data
    productCodes,
    isLoading,
    error,

    // Filters
    currentFilters,
    updateFilters,
    clearFilters,

    // Actions
    refetch,
    getProductCode,
    createProductCode,
    updateProductCode,
    deleteProductCode,
    createBulkProductCodes,
    updateProductCodeStatus,
    getAvailableProductCodes,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,
    isMutating,

    // Utility
    statusOptions,
    getStatusLabel,
    getStatusColor,

    // Raw mutations
    createProductCodeMutation,
    updateProductCodeMutation,
    deleteProductCodeMutation,
  }
}
