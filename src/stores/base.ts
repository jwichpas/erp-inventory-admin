import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Ref, ComputedRef } from 'vue'

// Base store interface for common patterns
export interface BaseStoreState<T> {
  items: Ref<T[]>
  currentItem: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
}

export interface BaseStoreGetters<T> {
  itemsCount: ComputedRef<number>
  hasItems: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
}

export interface BaseStoreActions<T> {
  setItems: (items: T[]) => void
  addItem: (item: T) => void
  updateItem: (id: string, updates: Partial<T>) => void
  removeItem: (id: string) => void
  setCurrentItem: (item: T | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

// Base store factory function
export function createBaseStore<T extends { id: string }>(storeName: string) {
  return defineStore(storeName, () => {
    // State
    const items = ref<T[]>([])
    const currentItem = ref<T | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Getters
    const itemsCount = computed(() => items.value.length)
    const hasItems = computed(() => items.value.length > 0)
    const isLoading = computed(() => loading.value)
    const hasError = computed(() => error.value !== null)

    // Actions
    const setItems = (newItems: T[]) => {
      items.value = newItems
    }

    const addItem = (item: T) => {
      items.value.push(item as any)
    }

    const updateItem = (id: string, updates: Partial<T>) => {
      const index = items.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        items.value[index] = { ...items.value[index], ...updates }
      }
    }

    const removeItem = (id: string) => {
      const index = items.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        items.value.splice(index, 1)
      }
    }

    const setCurrentItem = (item: T | null) => {
      currentItem.value = item
    }

    const setLoading = (isLoading: boolean) => {
      loading.value = isLoading
    }

    const setError = (errorMessage: string | null) => {
      error.value = errorMessage
    }

    const clearError = () => {
      error.value = null
    }

    const reset = () => {
      items.value = []
      currentItem.value = null
      loading.value = false
      error.value = null
    }

    return {
      // State
      items,
      currentItem,
      loading,
      error,
      // Getters
      itemsCount,
      hasItems,
      isLoading,
      hasError,
      // Actions
      setItems,
      addItem,
      updateItem,
      removeItem,
      setCurrentItem,
      setLoading,
      setError,
      clearError,
      reset,
    }
  })
}

// Async action helpers
export interface AsyncActionOptions {
  showLoading?: boolean
  clearError?: boolean
}

export function withAsyncAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  options: AsyncActionOptions = {},
): T {
  const { showLoading = true, clearError = true } = options

  return (async (...args: Parameters<T>) => {
    try {
      if (clearError) setError(null)
      if (showLoading) setLoading(true)

      const result = await action(...args)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setError(errorMessage)
      throw error
    } finally {
      if (showLoading) setLoading(false)
    }
  }) as T
}
