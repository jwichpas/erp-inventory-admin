import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const userCompanies = ref<any[]>([])
  const currentCompanyId = ref<string | null>(null)
  const permissions = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const currentCompany = computed(() =>
    userCompanies.value.find((uc) => uc.company_id === currentCompanyId.value),
  )
  const hasMultipleCompanies = computed(() => userCompanies.value.length > 1)

  // Actions
  const setUser = (newUser: User | null) => {
    user.value = newUser
  }

  const setSession = (newSession: Session | null) => {
    session.value = newSession
    if (newSession?.user) {
      setUser(newSession.user)
    } else {
      setUser(null)
    }
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

  // Simplified initialize for testing
  const initialize = async () => {
    console.log('Auth store: Starting simple initialization...')
    setLoading(true)
    clearError()

    try {
      // Simulate initialization delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      console.log('Auth store: No Supabase connection - using mock state')
      setSession(null)

      console.log('Auth store: Simple initialization completed')
    } catch (error) {
      console.error('Auth store: Simple initialization failed:', error)
      setError(error instanceof Error ? error.message : 'Initialization failed')
    } finally {
      setLoading(false)
      console.log('Auth store: Loading set to false')
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('Mock sign in:', email)
    return { user: null, session: null }
  }

  const signOut = async () => {
    console.log('Mock sign out')
    setSession(null)
  }

  const hasPermission = (permission: string): boolean => {
    return false
  }

  const hasCompanyAccess = async (companyId: string): Promise<boolean> => {
    return false
  }

  const loadUserCompanies = async () => {
    console.log('Mock load companies')
  }

  return {
    // State
    user,
    session,
    userCompanies,
    currentCompanyId,
    permissions,
    loading,
    error,
    // Getters
    isAuthenticated,
    currentCompany,
    hasMultipleCompanies,
    // Actions
    setUser,
    setSession,
    setLoading,
    setError,
    clearError,
    signIn,
    signOut,
    hasPermission,
    hasCompanyAccess,
    loadUserCompanies,
    initialize,
  }
})
