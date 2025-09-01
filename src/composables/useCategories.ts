import { computed, ref } from 'vue'
import { useSupabaseQuery } from './useSupabaseQuery'
import type { Category } from '@/types/database'
import type { CategoryFormData } from '@/schemas/productSchemas'

export interface CategoryFilters {
  search?: string
  parentId?: string
  isActive?: boolean
}

export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[]
  level?: number
}

export const useCategories = (filters: CategoryFilters = {}) => {
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
    if (filters.parentId === null) {
      filters.parent_id = 'is.null'
      delete filters.parentId
    } else if (filters.parentId) {
      filters.parent_id = `eq.${filters.parentId}`
      delete filters.parentId
    }
    if (filters.isActive !== undefined) {
      filters.active = `eq.${filters.isActive}`
      delete filters.isActive
    }
    return filters
  })

  // Query for categories list
  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = createSelectQuery<Category>(
    'categories',
    '*',
    queryFilters,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  )

  // Get single category
  const getCategory = (id: string) => {
    return createSelectQuery<Category>(
      'categories',
      '*',
      { id },
      {
        enabled: computed(() => !!id),
      },
    )
  }

  // Create category mutation
  const createCategoryMutation = createInsertMutation<Category>('categories', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  // Update category mutation
  const updateCategoryMutation = createUpdateMutation<Category>('categories', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  // Delete category mutation
  const deleteCategoryMutation = createDeleteMutation('categories', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  // Helper functions
  const updateFilters = (newFilters: Partial<CategoryFilters>) => {
    currentFilters.value = { ...currentFilters.value, ...newFilters }
  }

  const clearFilters = () => {
    currentFilters.value = {}
  }

  const createCategory = async (categoryData: CategoryFormData) => {
    return createCategoryMutation.mutateAsync(categoryData)
  }

  const updateCategory = async (id: string, categoryData: Partial<Category>) => {
    return updateCategoryMutation.mutateAsync({ id, data: categoryData })
  }

  const deleteCategory = async (id: string) => {
    return deleteCategoryMutation.mutateAsync(id)
  }

  // Build hierarchical tree structure
  const buildCategoryTree = (categories: Category[]): CategoryTreeNode[] => {
    const categoryMap = new Map<string, CategoryTreeNode>()
    const rootCategories: CategoryTreeNode[] = []

    // First pass: create all nodes
    categories.forEach((category) => {
      categoryMap.set(category.id, { ...category, children: [], level: 0 })
    })

    // Second pass: build hierarchy
    categories.forEach((category) => {
      const node = categoryMap.get(category.id)!

      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id)
        if (parent) {
          parent.children!.push(node)
          node.level = (parent.level || 0) + 1
        } else {
          // Parent not found, treat as root
          rootCategories.push(node)
        }
      } else {
        rootCategories.push(node)
      }
    })

    return rootCategories
  }

  // Flatten tree for dropdown display
  const flattenCategoryTree = (tree: CategoryTreeNode[]): CategoryTreeNode[] => {
    const flattened: CategoryTreeNode[] = []

    const traverse = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((node) => {
        flattened.push(node)
        if (node.children && node.children.length > 0) {
          traverse(node.children)
        }
      })
    }

    traverse(tree)
    return flattened
  }

  // Computed properties
  const isCreating = computed(() => createCategoryMutation.isPending.value)
  const isUpdating = computed(() => updateCategoryMutation.isPending.value)
  const isDeleting = computed(() => deleteCategoryMutation.isPending.value)
  const isMutating = computed(() => isCreating.value || isUpdating.value || isDeleting.value)

  // Get active categories for dropdowns
  const activeCategories = computed(
    () => categories.value?.filter((category) => category.active) || [],
  )

  // Category tree structure
  const categoryTree = computed(() => (categories.value ? buildCategoryTree(categories.value) : []))

  // Flattened categories for dropdowns with indentation
  const flatCategories = computed(() => flattenCategoryTree(categoryTree.value))

  // Root categories (no parent)
  const rootCategories = computed(
    () => categories.value?.filter((category) => !category.parent_id) || [],
  )

  return {
    // Data
    categories,
    activeCategories,
    categoryTree,
    flatCategories,
    rootCategories,
    isLoading,
    error,

    // Filters
    currentFilters,
    updateFilters,
    clearFilters,

    // Actions
    refetch,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,
    isMutating,

    // Utility functions
    buildCategoryTree,
    flattenCategoryTree,

    // Raw mutations
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
  }
}
