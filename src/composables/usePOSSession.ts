import { ref, computed, readonly } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { POSSession, POSStats } from '@/types/pos'
import { posSessionSchema } from '@/schemas/posSchemas'

export const usePOSSession = () => {
  const companyStore = useCompanyStore()
  const authStore = useAuthStore()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Get current user info
  const getCurrentUserInfo = () => {
    return {
      id: authStore.user?.id,
      full_name: authStore.user?.user_metadata?.full_name || authStore.user?.email || 'Usuario',
      email: authStore.user?.email
    }
  }

  // Current session query
  const {
    data: currentSession,
    isLoading: isLoadingSession,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['pos-session', companyStore.currentCompany?.id, authStore.user?.id],
    queryFn: async () => {
      if (!companyStore.currentCompany?.id || !authStore.user?.id) return null

      const { data, error } = await supabase
        .from('pos_sessions')
        .select('*')
        .eq('company_id', companyStore.currentCompany.id)
        .eq('user_id', authStore.user.id)
        .eq('status', 'OPEN')
        .maybeSingle()

      if (error) {
        console.error('Error fetching POS session:', error)
        return null
      }

      return data as POSSession | null
    },
    enabled: computed(() => !!companyStore.currentCompany?.id && !!authStore.user?.id),
  })

  // Session stats query
  const { data: sessionStats } = useQuery({
    queryKey: ['pos-session-stats', currentSession?.value?.id],
    queryFn: async () => {
      if (!currentSession.value?.id) return null

      const { data, error } = await supabase.rpc('get_pos_session_stats', {
        session_id: currentSession.value.id,
      })

      if (error) {
        console.error('Error fetching session stats:', error)
        return null
      }

      return data as POSStats
    },
    enabled: computed(() => !!currentSession.value?.id),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Open session mutation
  const openSessionMutation = useMutation({
    mutationFn: async (params: { warehouseId: string; openingAmount: number; notes?: string }) => {
      if (!companyStore.currentCompany?.id || !authStore.user?.id) {
        throw new Error('Usuario o empresa no válidos')
      }

      // Validate input
      const validatedData = posSessionSchema.parse({
        openingAmount: params.openingAmount,
        notes: params.notes,
      })

      const { data, error } = await supabase
        .from('pos_sessions')
        .insert({
          company_id: companyStore.currentCompany.id,
          user_id: authStore.user.id,
          warehouse_id: params.warehouseId,
          opened_at: new Date().toISOString(),
          opening_amount: validatedData.openingAmount,
          status: 'OPEN',
          notes: validatedData.notes,
        })
        .select()
        .single()

      if (error) throw error
      return data as POSSession
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pos-session'] })
      showToast('Sesión POS abierta exitosamente', 'success')
    },
    onError: (error) => {
      console.error('Error opening POS session:', error)
      showToast('Error al abrir sesión POS', 'error')
    },
  })

  // Close session mutation
  const closeSessionMutation = useMutation({
    mutationFn: async (params: { closingAmount: number; notes?: string }) => {
      if (!currentSession.value?.id) {
        throw new Error('No hay sesión activa')
      }

      // Calculate expected amount from sales
      const { data: salesData, error: salesError } = await supabase.rpc(
        'calculate_session_expected_amount',
        {
          session_id: currentSession.value.id,
        },
      )

      if (salesError) throw salesError

      const expectedAmount = currentSession.value.opening_amount + (salesData?.cash_sales || 0)
      const difference = params.closingAmount - expectedAmount

      const { data, error } = await supabase
        .from('pos_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_amount: params.closingAmount,
          expected_amount: expectedAmount,
          difference: difference,
          status: 'CLOSED',
          notes: params.notes,
        })
        .eq('id', currentSession.value.id)
        .select()
        .single()

      if (error) throw error
      return data as POSSession
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pos-session'] })
      showToast('Sesión POS cerrada exitosamente', 'success')
    },
    onError: (error) => {
      console.error('Error closing POS session:', error)
      showToast('Error al cerrar sesión POS', 'error')
    },
  })

  // Today's sessions query
  const { data: todaySessions } = useQuery({
    queryKey: ['pos-sessions-today', companyStore.currentCompany?.id],
    queryFn: async () => {
      if (!companyStore.currentCompany?.id) return []

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('pos_sessions')
        .select(
          `
          *,
          warehouses!inner(name)
        `,
        )
        .eq('company_id', companyStore.currentCompany.id)
        .gte('opened_at', today.toISOString())
        .order('opened_at', { ascending: false })

      if (error) {
        console.error('Error fetching today sessions:', error)
        return []
      }

      return data as POSSession[]
    },
    enabled: computed(() => !!companyStore.currentCompany?.id),
  })

  const isSessionOpen = computed(() => currentSession.value?.status === 'OPEN')
  const canOpenSession = computed(() => !isSessionOpen.value && !isLoadingSession.value)
  const canCloseSession = computed(() => isSessionOpen.value)

  const openSession = (warehouseId: string, openingAmount: number, notes?: string) => {
    return openSessionMutation.mutate({ warehouseId, openingAmount, notes })
  }

  const closeSession = (closingAmount: number, notes?: string) => {
    return closeSessionMutation.mutate({ closingAmount, notes })
  }

  return {
    // Data
    currentSession: readonly(currentSession),
    sessionStats: readonly(sessionStats),
    todaySessions: readonly(todaySessions),
    currentUserInfo: computed(() => getCurrentUserInfo()),

    // Loading states
    isLoadingSession: readonly(isLoadingSession),
    isOpeningSession: computed(() => openSessionMutation.isPending),
    isClosingSession: computed(() => closeSessionMutation.isPending),

    // Computed
    isSessionOpen: readonly(isSessionOpen),
    canOpenSession: readonly(canOpenSession),
    canCloseSession: readonly(canCloseSession),

    // Methods
    openSession,
    closeSession,
    refetchSession,
  }
}
