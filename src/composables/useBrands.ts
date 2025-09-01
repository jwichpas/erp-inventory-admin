import { computed, ref } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import type { Brand } from '@/types/database'
import type { BrandFormData } from '@/schemas/productSchemas'

export interface BrandFilters {
  search?: string
  isActive?: boolean
}

export const useBrands = (filters: BrandFilters = {}) => {
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
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filters.or = `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`
      delete filters.search
    }
    if (filters.isActive !== undefined) {
      filters.active = `eq.${filters.isActive}`
      delete filters.isActive
    }
    return filters
  })

  // Query for brands list
  const {
    data: brands,
    isLoading,
    error,
    refetch,
  } = createSelectQuery<Brand>(
    'brands',
    '*',
    queryFilters,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  )

  // Get single brand
  const getBrand = (id: string) => {
    return createSelectQuery<Brand>(
      'brands',
      '*',
      { id },
      {
        enabled: computed(() => !!id),
      },
    )
  }

  // Create brand mutation
  const createBrandMutation = createInsertMutation<Brand>('brands', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })

  // Update brand mutation
  const updateBrandMutation = createUpdateMutation<Brand>('brands', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })

  // Delete brand mutation
  const deleteBrandMutation = createDeleteMutation('brands', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })

  // Helper functions
  const updateFilters = (newFilters: Partial<BrandFilters>) => {
    currentFilters.value = { ...currentFilters.value, ...newFilters }
  }

  const clearFilters = () => {
    currentFilters.value = {}
  }

  const createBrand = async (brandData: BrandFormData) => {
    return createBrandMutation.mutateAsync(brandData)
  }

  const updateBrand = async (id: string, brandData: Partial<Brand>) => {
    return updateBrandMutation.mutateAsync({ id, data: brandData })
  }

  const deleteBrand = async (id: string) => {
    return deleteBrandMutation.mutateAsync(id)
  }

  // Computed properties
  const isCreating = computed(() => createBrandMutation.isPending.value)
  const isUpdating = computed(() => updateBrandMutation.isPending.value)
  const isDeleting = computed(() => deleteBrandMutation.isPending.value)
  const isMutating = computed(() => isCreating.value || isUpdating.value || isDeleting.value)

  // Get active brands for dropdowns
  const activeBrands = computed(() => brands.value?.filter((brand) => brand.active) || [])

  return {
    // Data
    brands,
    activeBrands,
    isLoading,
    error,

    // Filters
    currentFilters,
    updateFilters,
    clearFilters,

    // Actions
    refetch,
    getBrand,
    createBrand,
    updateBrand,
    deleteBrand,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,
    isMutating,

    // Raw mutations
    createBrandMutation,
    updateBrandMutation,
    deleteBrandMutation,
  }
}
