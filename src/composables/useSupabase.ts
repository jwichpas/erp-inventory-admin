import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js'

export interface UseSupabaseOptions {
  showLoading?: boolean
  throwOnError?: boolean
}

export function useSupabase() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoading = computed(() => loading.value)
  const hasError = computed(() => error.value !== null)

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading
  }

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  const clearError = () => {
    error.value = null
  }

  const handleError = (err: unknown): string => {
    let errorMessage = 'An unexpected error occurred'

    if (err && typeof err === 'object') {
      if ('message' in err && typeof err.message === 'string') {
        errorMessage = err.message
      } else if ('error_description' in err && typeof err.error_description === 'string') {
        errorMessage = err.error_description
      }
    }

    setError(errorMessage)
    return errorMessage
  }

  const executeQuery = async <T>(
    queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
    options: UseSupabaseOptions = {},
  ): Promise<T | null> => {
    const { showLoading = true, throwOnError = true } = options

    try {
      if (showLoading) setLoading(true)
      clearError()

      const { data, error: queryError } = await queryFn()

      if (queryError) {
        const errorMessage = handleError(queryError)
        if (throwOnError) {
          throw new Error(errorMessage)
        }
        return null
      }

      return data
    } catch (err) {
      const errorMessage = handleError(err)
      if (throwOnError) {
        throw new Error(errorMessage)
      }
      return null
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const executeRpc = async <T>(
    rpcName: string,
    params?: Record<string, any>,
    options: UseSupabaseOptions = {},
  ): Promise<T | null> => {
    const { showLoading = true, throwOnError = true } = options

    try {
      if (showLoading) setLoading(true)
      clearError()

      const { data, error: rpcError } = await (supabase as any).rpc(rpcName, params || {})

      if (rpcError) {
        const errorMessage = handleError(rpcError)
        if (throwOnError) {
          throw new Error(errorMessage)
        }
        return null
      }

      return data as T
    } catch (err) {
      const errorMessage = handleError(err)
      if (throwOnError) {
        throw new Error(errorMessage)
      }
      return null
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Realtime subscription helper
  const subscribeToTable = (
    table: keyof Database['public']['Tables'],
    callback: (payload: any) => void,
    filter?: string,
  ): RealtimeChannel => {
    let channel = supabase.channel(`${table}-changes`)

    if (filter) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table as string,
          filter,
        },
        callback,
      )
    } else {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table as string,
        },
        callback,
      )
    }

    channel.subscribe()
    return channel
  }

  const unsubscribe = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel)
  }

  return {
    // State
    loading,
    error,
    // Getters
    isLoading,
    hasError,
    // Actions
    setLoading,
    setError,
    clearError,
    handleError,
    executeQuery,
    executeRpc,
    subscribeToTable,
    unsubscribe,
    // Direct access to supabase client
    supabase,
  }
}
