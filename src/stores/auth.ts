import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserCompanyResult } from '@/types/database'
import { appConfig } from '@/config/app'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const userCompanies = ref<UserCompanyResult[]>([])
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

  const setUserCompanies = (companies: UserCompanyResult[]) => {
    userCompanies.value = companies
    // Don't auto-select company here, let the component handle it
  }

  const setCurrentCompany = (companyId: string) => {
    const company = userCompanies.value.find((uc) => uc.company_id === companyId)
    if (company) {
      currentCompanyId.value = companyId
      // Handle permissions - they might be an array or JSONB
      if (Array.isArray(company.permissions)) {
        permissions.value = company.permissions
      } else if (company.permissions && typeof company.permissions === 'object') {
        // If it's a JSONB object, try to extract array
        permissions.value = Array.isArray(company.permissions) ? company.permissions : []
      } else {
        permissions.value = []
      }
      // Store in localStorage for persistence
      localStorage.setItem('currentCompanyId', companyId)
      console.log('Set current company:', companyId, 'permissions:', permissions.value)
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

  // Auth methods
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      clearError()

      if (appConfig.useMockAuth) {
        // Mock sign in - accept any email/password for demo
        console.log('Auth store: Mock sign in for:', email)

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Create mock session data
        const mockSessionData = {
          userId: 'mock-user-' + Date.now(),
          email: email,
          fullName: email.split('@')[0], // Use email prefix as name
        }

        // Store in localStorage for persistence
        localStorage.setItem('mockSession', JSON.stringify(mockSessionData))

        // Create mock user and session
        const mockUser = {
          id: mockSessionData.userId,
          email: mockSessionData.email,
          user_metadata: { full_name: mockSessionData.fullName },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User

        const mockSession = {
          user: mockUser,
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_at: Date.now() + 3600000, // 1 hour from now
        } as Session

        setSession(mockSession)

        // Mock companies - using UUID format for more realistic IDs
        const mockCompanies = [
          {
            company_id: '550e8400-e29b-41d4-a716-446655440000',
            company_name: 'Demo Company',
            role_name: 'Admin',
            permissions: ['dashboard.view', 'inventory.view', 'products.view', 'sales.view'],
          },
          {
            company_id: '550e8400-e29b-41d4-a716-446655440001',
            company_name: 'Empresa Secundaria',
            role_name: 'Manager',
            permissions: ['dashboard.view', 'inventory.view', 'products.view'],
          },
        ]
        setUserCompanies(mockCompanies)
        setCurrentCompany('550e8400-e29b-41d4-a716-446655440000')

        console.log('Auth store: Mock sign in successful')

        return { user: mockUser, session: mockSession }
      } else {
        // Real Supabase authentication
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setSession(data.session)

        // Load user companies from database
        if (data.user) {
          await loadUserCompanies()
        }

        return data
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true)
      clearError()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) throw signUpError

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      clearError()

      if (appConfig.useMockAuth) {
        console.log('Auth store: Mock sign out')

        // Clear mock session from localStorage
        localStorage.removeItem('mockSession')
      } else {
        // Real Supabase sign out
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }

      // Clear common state
      localStorage.removeItem('currentCompanyId')
      setSession(null)
      setUserCompanies([])
      currentCompanyId.value = null
      permissions.value = []

      console.log('Auth store: Sign out completed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      clearError()

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (password: string) => {
    try {
      setLoading(true)
      clearError()

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password update failed'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const loadUserCompanies = async () => {
    try {
      if (!user.value) {
        console.log('No user available, skipping company load')
        return
      }

      const { data, error } = await supabase.rpc('get_user_companies')
      if (error) {
        console.error('RPC error loading companies:', error)
        throw error
      }

      const companies = (data as UserCompanyResult[]) || []
      console.log('Loaded companies:', companies.length)
      setUserCompanies(companies)

      // Only restore previous company selection if it exists and is valid
      const savedCompanyId = localStorage.getItem('currentCompanyId')
      if (
        savedCompanyId &&
        companies.some((uc: UserCompanyResult) => uc.company_id === savedCompanyId)
      ) {
        console.log('Restoring saved company:', savedCompanyId)
        setCurrentCompany(savedCompanyId)
      }
      // Don't auto-select first company, let the user choose or component handle it
    } catch (error) {
      console.error('Failed to load user companies:', error)
      setError('Failed to load companies')
      throw error
    }
  }

  const hasPermission = (permission: string): boolean => {
    return permissions.value.includes(permission)
  }

  const hasCompanyAccess = async (companyId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('auth_has_company_access', {
        company_id: companyId,
      } as any)
      if (error) throw error
      return data || false
    } catch (error) {
      console.error('Failed to check company access:', error)
      return false
    }
  }

  const initialize = async () => {
    console.log('Auth store: Starting initialization...')

    try {
      setLoading(true)
      clearError()

      if (appConfig.useMockAuth) {
        // Simple delay to simulate initialization
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Check for mock session in localStorage
        const mockSession = localStorage.getItem('mockSession')
        if (mockSession) {
          console.log('Auth store: Found mock session, restoring user')
          const sessionData = JSON.parse(mockSession)

          // Create a mock user and session
          const mockUser = {
            id: sessionData.userId,
            email: sessionData.email,
            user_metadata: { full_name: sessionData.fullName },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as User

          const mockSessionObj = {
            user: mockUser,
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_at: Date.now() + 3600000, // 1 hour from now
          } as Session

          setSession(mockSessionObj)

          // Mock companies - using UUID format for more realistic IDs
          const mockCompanies = [
            {
              company_id: '550e8400-e29b-41d4-a716-446655440000',
              company_name: 'Demo Company',
              role_name: 'Admin',
              permissions: ['dashboard.view', 'inventory.view', 'products.view', 'sales.view'],
            },
            {
              company_id: '550e8400-e29b-41d4-a716-446655440001',
              company_name: 'Empresa Secundaria',
              role_name: 'Manager',
              permissions: ['dashboard.view', 'inventory.view', 'products.view'],
            },
          ]
          setUserCompanies(mockCompanies)
          setCurrentCompany('550e8400-e29b-41d4-a716-446655440000')

          console.log('Auth store: Mock session restored successfully')
        } else {
          console.log('Auth store: No mock session found, setting empty session')
          setSession(null)
        }
      } else {
        // Real Supabase initialization
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth store: Error getting session:', error)
          throw error
        }

        if (session) {
          setSession(session)
          await loadUserCompanies()
        } else {
          setSession(null)
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event)
          setSession(session)

          if (session?.user) {
            await loadUserCompanies()
          } else {
            setUserCompanies([])
            currentCompanyId.value = null
            permissions.value = []
          }
        })
      }

      console.log('Auth store: Initialization completed')
    } catch (error) {
      console.error('Auth store: Safe initialization failed:', error)
      setError('Initialization failed')
    } finally {
      setLoading(false)
      console.log('Auth store: Loading set to false')
    }
  }

  const reset = () => {
    user.value = null
    session.value = null
    userCompanies.value = []
    currentCompanyId.value = null
    permissions.value = []
    loading.value = false
    error.value = null
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
    setUserCompanies,
    setCurrentCompany,
    setLoading,
    setError,
    clearError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    loadUserCompanies,
    hasPermission,
    hasCompanyAccess,
    initialize,
    reset,
  }
})
