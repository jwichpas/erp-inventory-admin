import { computed } from 'vue'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'

export const usePermissions = () => {
  const companyStore = useCompanyStore()
  const authStore = useAuthStore()

  const hasPermission = (permission: string): boolean => {
    if (!authStore.isAuthenticated || !companyStore.currentCompanyId) {
      return false
    }

    try {
      return companyStore.checkPermission(permission)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    for (const permission of permissions) {
      if (hasPermission(permission)) {
        return true
      }
    }
    return false
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    for (const permission of permissions) {
      if (!hasPermission(permission)) {
        return false
      }
    }
    return true
  }

  // Reactive computed properties for common permissions
  const canViewDashboard = computed(() => hasPermission('dashboard.view'))
  const canManageInventory = computed(() => hasPermission('inventory.manage'))
  const canViewInventory = computed(() => hasPermission('inventory.view'))
  const canManageProducts = computed(() => hasPermission('products.manage'))
  const canViewProducts = computed(() => hasPermission('products.view'))
  const canManageSales = computed(() => hasPermission('sales.manage'))
  const canViewSales = computed(() => hasPermission('sales.view'))
  const canManagePurchases = computed(() => hasPermission('purchases.manage'))
  const canViewPurchases = computed(() => hasPermission('purchases.view'))
  const canViewReports = computed(() => hasPermission('reports.view'))
  const canManageUsers = computed(() => hasPermission('users.manage'))
  const canManageCompanies = computed(() => hasPermission('companies.manage'))
  const canViewWarehouse3D = computed(() => hasPermission('warehouse.3d.view'))
  const canManageWarehouse = computed(() => hasPermission('warehouse.manage'))
  const canViewPos = computed(() => hasPermission('pos.access'))

  // Helper function to check if user is admin
  const isAdmin = computed(() => hasPermission('admin.all'))

  // Helper function to check if user can access a specific company
  const canAccessCompany = async (companyId: string): Promise<boolean> => {
    if (!authStore.isAuthenticated) return false

    try {
      const { data } = await authStore.supabase.rpc('app_functions.auth_has_company_access', {
        company_id: companyId,
      })

      return data || false
    } catch (error) {
      console.error('Error checking company access:', error)
      return false
    }
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessCompany,

    // Common permission checks
    canViewDashboard,
    canManageInventory,
    canViewInventory,
    canManageProducts,
    canViewProducts,
    canManageSales,
    canViewSales,
    canManagePurchases,
    canViewPurchases,
    canViewReports,
    canManageUsers,
    canManageCompanies,
    canViewWarehouse3D,
    canManageWarehouse,
    isAdmin,
    canViewPos,
  }
}
