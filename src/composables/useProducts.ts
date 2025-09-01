import { computed, ref } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import type { Product } from '@/types/database'

export interface ProductFilters {
  search?: string
  brandId?: string
  categoryId?: string
  isActive?: boolean
  minStock?: number
}

export interface CreateProductData {
  sku: string
  name: string
  brand_id?: string
  category_id?: string
  unit_code: string
  tipo_afectacion: string
  is_serialized: boolean
  min_stock: number
  dimensions?: {
    width: number
    height: number
    length: number
    weight: number
  }
}

export const useProducts = (filters: ProductFilters = {}) => {
  const {
    createSelectQuery,
    createInsertMutation,
    createUpdateMutation,
    createDeleteMutation,
    queryClient,
  } = useSupabaseQuery()

  // Reactive filters
  const currentFilters = ref(filters)

  // Create filters computed
  const queryFilters = computed(() => {
    const filters: any = { ...currentFilters.value }

    // Transform search to use full-text search if available
    if (filters.search) {
      // Use text search on name and sku columns
      const searchTerm = filters.search.toLowerCase()
      filters.or = `name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`
      delete filters.search
    }

    // Transform brand filter
    if (filters.brandId) {
      filters.brand_id = `eq.${filters.brandId}`
      delete filters.brandId
    }

    // Transform category filter
    if (filters.categoryId) {
      filters.category_id = `eq.${filters.categoryId}`
      delete filters.categoryId
    }

    return filters
  })

  // Query for products list
  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = createSelectQuery<Product>(
    'products',
    `
      *,
      brands:brand_id(id, name),
      categories:category_id(id, name)
    `,
    queryFilters,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  )

  // Search products with full-text search
  const searchProducts = (searchTerm: string) => {
    const searchFilters = computed(() => {
      if (!searchTerm) return {}

      // Use text search on multiple columns
      const term = searchTerm.toLowerCase()
      return {
        or: `name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`,
      }
    })

    return createSelectQuery<Product>(
      'products',
      '*',
      searchFilters,
      {
        enabled: computed(() => !!searchTerm),
      },
    )
  }

  // Get single product
  const getProduct = (id: string) => {
    return createSelectQuery<Product>(
      'products',
      `
        *,
        brands:brand_id(id, name),
        categories:category_id(id, name),
        product_images(id, image_url, is_primary)
      `,
      { id },
      {
        enabled: computed(() => !!id),
      },
    )
  }

  // Create product mutation
  const createProductMutation = createInsertMutation<Product>('products', {
    onSuccess: () => {
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Update product mutation
  const updateProductMutation = createUpdateMutation<Product>('products', {
    onSuccess: () => {
      // Invalidate products list and individual product queries
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Delete product mutation
  const deleteProductMutation = createDeleteMutation('products', {
    onSuccess: () => {
      // Invalidate products list
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  // Helper functions
  const updateFilters = (newFilters: Partial<ProductFilters>) => {
    currentFilters.value = { ...currentFilters.value, ...newFilters }
  }

  const clearFilters = () => {
    currentFilters.value = {}
  }

  const createProduct = async (productData: CreateProductData) => {
    return createProductMutation.mutateAsync(productData)
  }

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    return updateProductMutation.mutateAsync({ id, data: productData })
  }

  const deleteProduct = async (id: string) => {
    return deleteProductMutation.mutateAsync(id)
  }

  // Computed properties
  const isCreating = computed(() => createProductMutation.isPending.value)
  const isUpdating = computed(() => updateProductMutation.isPending.value)
  const isDeleting = computed(() => deleteProductMutation.isPending.value)
  const isMutating = computed(() => isCreating.value || isUpdating.value || isDeleting.value)

  return {
    // Data
    products,
    isLoading,
    error,

    // Filters
    currentFilters,
    updateFilters,
    clearFilters,

    // Actions
    refetch,
    searchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,
    isMutating,

    // Raw mutations (for advanced usage)
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
  }
}
