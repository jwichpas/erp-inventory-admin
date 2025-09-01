import { useQueryClient } from '@tanstack/vue-query'
import { useErrorHandler } from './useErrorHandler'

export interface OptimisticUpdateOptions<T> {
  queryKey: (string | number)[]
  updateFn: (oldData: T[] | undefined, newItem: T) => T[]
  rollbackFn?: (oldData: T[] | undefined, failedItem: T) => T[]
}

export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useErrorHandler()

  // Optimistic create
  const optimisticCreate = async <T extends { id?: string }>(
    options: OptimisticUpdateOptions<T>,
    mutationFn: () => Promise<T>,
    newItem: T,
    successMessage?: string,
  ) => {
    const { queryKey, updateFn, rollbackFn } = options

    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey)

    // Optimistically update to the new value
    queryClient.setQueryData<T[]>(queryKey, (old) => updateFn(old, newItem))

    try {
      // Perform the actual mutation
      const result = await mutationFn()

      // Update with the real data from server
      queryClient.setQueryData<T[]>(queryKey, (old) => {
        if (!old) return [result]
        return old.map((item) => (item.id === newItem.id ? result : item))
      })

      if (successMessage) {
        showSuccessToast(successMessage)
      }

      return result
    } catch (error) {
      // Rollback on error
      if (rollbackFn) {
        queryClient.setQueryData<T[]>(queryKey, (old) => rollbackFn(old, newItem))
      } else {
        queryClient.setQueryData<T[]>(queryKey, previousData)
      }

      showErrorToast('Error al crear el registro')
      throw error
    }
  }

  // Optimistic update
  const optimisticUpdate = async <T extends { id: string }>(
    options: OptimisticUpdateOptions<T>,
    mutationFn: () => Promise<T>,
    updatedItem: T,
    successMessage?: string,
  ) => {
    const { queryKey, updateFn, rollbackFn } = options

    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey)

    // Optimistically update to the new value
    queryClient.setQueryData<T[]>(queryKey, (old) => {
      if (!old) return [updatedItem]
      return old.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    })

    try {
      // Perform the actual mutation
      const result = await mutationFn()

      // Update with the real data from server
      queryClient.setQueryData<T[]>(queryKey, (old) => {
        if (!old) return [result]
        return old.map((item) => (item.id === result.id ? result : item))
      })

      if (successMessage) {
        showSuccessToast(successMessage)
      }

      return result
    } catch (error) {
      // Rollback on error
      if (rollbackFn) {
        queryClient.setQueryData<T[]>(queryKey, (old) => rollbackFn(old, updatedItem))
      } else {
        queryClient.setQueryData<T[]>(queryKey, previousData)
      }

      showErrorToast('Error al actualizar el registro')
      throw error
    }
  }

  // Optimistic delete
  const optimisticDelete = async <T extends { id: string }>(
    options: OptimisticUpdateOptions<T>,
    mutationFn: () => Promise<void>,
    itemToDelete: T,
    successMessage?: string,
  ) => {
    const { queryKey, rollbackFn } = options

    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey)

    // Optimistically remove the item
    queryClient.setQueryData<T[]>(queryKey, (old) => {
      if (!old) return []
      return old.filter((item) => item.id !== itemToDelete.id)
    })

    try {
      // Perform the actual mutation
      await mutationFn()

      if (successMessage) {
        showSuccessToast(successMessage)
      }
    } catch (error) {
      // Rollback on error
      if (rollbackFn) {
        queryClient.setQueryData<T[]>(queryKey, (old) => rollbackFn(old, itemToDelete))
      } else {
        queryClient.setQueryData<T[]>(queryKey, previousData)
      }

      showErrorToast('Error al eliminar el registro')
      throw error
    }
  }

  // Batch optimistic updates
  const optimisticBatch = async <T extends { id: string }>(
    queryKey: (string | number)[],
    operations: Array<{
      type: 'create' | 'update' | 'delete'
      item: T
      mutationFn: () => Promise<T | void>
    }>,
    successMessage?: string,
  ) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey })

    // Snapshot the previous value
    const previousData = queryClient.getQueryData<T[]>(queryKey)

    try {
      // Apply all optimistic updates
      queryClient.setQueryData<T[]>(queryKey, (old) => {
        if (!old) return []

        let updated = [...old]

        operations.forEach(({ type, item }) => {
          switch (type) {
            case 'create':
              updated.push(item)
              break
            case 'update':
              updated = updated.map((existing) => (existing.id === item.id ? item : existing))
              break
            case 'delete':
              updated = updated.filter((existing) => existing.id !== item.id)
              break
          }
        })

        return updated
      })

      // Execute all mutations
      const results = await Promise.all(operations.map(({ mutationFn }) => mutationFn()))

      if (successMessage) {
        showSuccessToast(successMessage)
      }

      return results
    } catch (error) {
      // Rollback all changes on any error
      queryClient.setQueryData<T[]>(queryKey, previousData)
      showErrorToast('Error en la operación por lotes')
      throw error
    }
  }

  return {
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    optimisticBatch,
  }
}
