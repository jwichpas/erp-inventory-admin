import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Company, UserCompanyResult } from '@/types/database'
import { useAuthStore } from '@/stores/auth'

export const useCompanyStore = defineStore('company', () => {
  // State
  const currentCompany = ref<Company | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get auth store to access user companies
  const authStore = useAuthStore()

  // Getters
  const hasMultipleCompanies = computed(() => authStore.hasMultipleCompanies)
  const currentCompanyId = computed(() => authStore.currentCompanyId)
  const currentCompanyName = computed(() => {
    const company = authStore.currentCompany
    return company?.company_name || ''
  })
  const userCompanies = computed(() => authStore.userCompanies)

  // Actions
  const switchCompany = async (companyId: string) => {
    try {
      loading.value = true
      error.value = null

      // Use auth store method to switch company
      authStore.setCurrentCompany(companyId)

      // Fetch full company details for current company
      await fetchCurrentCompanyDetails(companyId)

      // Emit event for other components to react
      window.dispatchEvent(
        new CustomEvent('company-changed', {
          detail: { companyId },
        }),
      )
    } catch (err: any) {
      error.value = err.message || 'Error switching company'
      console.error('Error switching company:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchCurrentCompanyDetails = async (companyId: string) => {
    try {
      // For now, create a mock company object based on the company data from auth store
      const companyData = authStore.userCompanies.find((uc) => uc.company_id === companyId)

      if (companyData) {
        // Create a mock company object with the available data
        currentCompany.value = {
          id: companyData.company_id,
          ruc: '20123456789', // Mock RUC
          legal_name: companyData.company_name,
          commercial_name: companyData.company_name,
          currency_code: 'PEN',
          valuation_method: 'PROMEDIO_MOVIL',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Company
      }
    } catch (err) {
      console.error('Error fetching company details:', err)
    }
  }

  const initializeCompanyContext = async () => {
    try {
      // The auth store already handles company initialization
      // We just need to fetch details for the current company if one is set
      if (authStore.currentCompanyId) {
        await fetchCurrentCompanyDetails(authStore.currentCompanyId)
      }
    } catch (err) {
      console.error('Error initializing company context:', err)
    }
  }

  const clearCompanyContext = () => {
    currentCompany.value = null
    error.value = null
  }

  const checkPermission = (permission: string): boolean => {
    return authStore.hasPermission(permission)
  }

  const checkCompanyAccess = async (companyId: string): Promise<boolean> => {
    return await authStore.hasCompanyAccess(companyId)
  }

  return {
    // State
    currentCompany,
    loading,
    error,

    // Getters
    hasMultipleCompanies,
    currentCompanyId,
    currentCompanyName,
    userCompanies,

    // Actions
    switchCompany,
    initializeCompanyContext,
    clearCompanyContext,
    checkPermission,
    checkCompanyAccess,
  }
})
