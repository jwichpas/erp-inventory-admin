import { onMounted, onUnmounted, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeOptions {
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  filter?: string
  queryKey?: (string | number)[]
}

export const useRealtime = () => {
  const queryClient = useQueryClient()
  const companyStore = useCompanyStore()
  const channels = ref<RealtimeChannel[]>([])

  const subscribe = (options: RealtimeOptions) => {
    const { table, event = '*', schema = 'public', filter, queryKey = [table] } = options

    // Create channel name
    const channelName = `${schema}:${table}:${event}:${filter || 'all'}`

    // Create the channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          handleRealtimeChange(payload, queryKey)
        },
      )
      .subscribe()

    channels.value.push(channel)
    return channel
  }

  const handleRealtimeChange = (
    payload: RealtimePostgresChangesPayload<any>,
    queryKey: (string | number)[],
  ) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    // Only process changes for the current company
    if (
      companyStore.currentCompanyId &&
      newRecord?.company_id &&
      newRecord.company_id !== companyStore.currentCompanyId
    ) {
      return
    }

    switch (eventType) {
      case 'INSERT':
        // Add new record to existing queries
        queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
          if (!oldData) return [newRecord]
          return [...oldData, newRecord]
        })
        break

      case 'UPDATE':
        // Update existing record in queries
        queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
          if (!oldData) return [newRecord]
          return oldData.map((item) => (item.id === newRecord.id ? newRecord : item))
        })
        break

      case 'DELETE':
        // Remove record from queries
        queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
          if (!oldData) return []
          return oldData.filter((item) => item.id !== oldRecord.id)
        })
        break
    }

    // Invalidate related queries to ensure consistency
    queryClient.invalidateQueries({ queryKey })
  }

  // Subscribe to table changes with company filter
  const subscribeToTable = (table: string, options: Partial<RealtimeOptions> = {}) => {
    const filter = companyStore.currentCompanyId
      ? `company_id=eq.${companyStore.currentCompanyId}`
      : undefined

    return subscribe({
      table,
      filter,
      queryKey: [table],
      ...options,
    })
  }

  // Subscribe to specific record changes
  const subscribeToRecord = (
    table: string,
    recordId: string,
    options: Partial<RealtimeOptions> = {},
  ) => {
    return subscribe({
      table,
      filter: `id=eq.${recordId}`,
      queryKey: [table, recordId],
      ...options,
    })
  }

  // Subscribe to user notifications
  const subscribeToNotifications = (userId: string) => {
    return subscribe({
      table: 'notifications',
      filter: `recipient_user_id=eq.${userId}`,
      queryKey: ['notifications', userId],
    })
  }

  // Subscribe to stock changes
  const subscribeToStock = (warehouseId?: string) => {
    const filter = warehouseId
      ? `warehouse_id=eq.${warehouseId}`
      : companyStore.currentCompanyId
        ? `company_id=eq.${companyStore.currentCompanyId}`
        : undefined

    return subscribe({
      table: 'warehouse_stock',
      filter,
      queryKey: ['warehouse_stock', warehouseId],
    })
  }

  // Unsubscribe from all channels
  const unsubscribeAll = () => {
    channels.value.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    channels.value = []
  }

  // Unsubscribe from specific channel
  const unsubscribe = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel)
    channels.value = channels.value.filter((c) => c !== channel)
  }

  // Auto cleanup on unmount
  onUnmounted(() => {
    unsubscribeAll()
  })

  return {
    subscribe,
    subscribeToTable,
    subscribeToRecord,
    subscribeToNotifications,
    subscribeToStock,
    unsubscribe,
    unsubscribeAll,
    channels,
  }
}
