import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Global flag to track app initialization
let isAppInitialized = false
export const setAppInitialized = (value: boolean) => {
  isAppInitialized = value
}

// Route guards
const requireAuth = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore()

  // Wait for auth initialization if still loading
  if (authStore.loading) {
    console.log('requireAuth: Waiting for auth initialization...')
    let attempts = 0
    while (authStore.loading && attempts < 100) {
      // Max 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
      if (attempts % 20 === 0) {
        console.log(`requireAuth: Still waiting... attempt ${attempts}`)
      }
    }
  }

  if (!authStore.isAuthenticated) {
    // In development mode, allow access to basic routes without full authentication
    if (
      import.meta.env.DEV &&
      ['dashboard', 'products', 'inventory', 'sales', 'ui-demo'].includes(to.name as string)
    ) {
      console.log('requireAuth: Allowing access in dev mode for route:', to.name)
      next()
      return
    }
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  next()
}

const requirePermission = (permission: string) => {
  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    const authStore = useAuthStore()

    if (!authStore.isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }

    // Allow all authenticated users to access any route (bypass permission check)
    console.log(
      `requirePermission: Bypassing permission check for ${permission} - user is authenticated`,
    )
    next()
  }
}

const requireCompanyAccess = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore()
  console.log('requireCompanyAccess guard - navigating to:', to.path)
  console.log('Auth state:', {
    isAuthenticated: authStore.isAuthenticated,
    currentCompanyId: authStore.currentCompanyId,
    userCompaniesLength: authStore.userCompanies.length,
    loading: authStore.loading,
  })

  // Wait for auth initialization if still loading
  if (authStore.loading) {
    console.log('requireCompanyAccess: Waiting for auth initialization...')
    let attempts = 0
    while (authStore.loading && attempts < 100) {
      // Max 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
      if (attempts % 10 === 0) {
        console.log(`requireCompanyAccess: Still waiting... attempt ${attempts}, state:`, {
          loading: authStore.loading,
          isAuthenticated: authStore.isAuthenticated,
          hasUser: !!authStore.user,
          hasSession: !!authStore.session,
        })
      }
    }
    console.log('requireCompanyAccess: Auth wait completed, final state:', {
      loading: authStore.loading,
      isAuthenticated: authStore.isAuthenticated,
      hasUser: !!authStore.user,
      hasSession: !!authStore.session,
      currentCompanyId: authStore.currentCompanyId,
      userCompaniesLength: authStore.userCompanies.length,
    })
  }

  if (!authStore.isAuthenticated) {
    // In development mode, allow access to basic routes without full authentication
    if (
      import.meta.env.DEV &&
      ['dashboard', 'products', 'inventory', 'sales', 'ui-demo'].includes(to.name as string)
    ) {
      console.log('requireCompanyAccess: Allowing access in dev mode for route:', to.name)
      next()
      return
    }
    console.log('requireCompanyAccess: Not authenticated, redirecting to login')
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (!authStore.currentCompanyId) {
    console.log('requireCompanyAccess: No current company selected')
    // If user has companies but none selected, go to company select
    if (authStore.userCompanies.length > 0) {
      console.log('requireCompanyAccess: User has companies, redirecting to company-select')
      next({ name: 'company-select' })
    } else {
      console.log('requireCompanyAccess: No companies found, redirecting to unauthorized')
      next({ name: 'unauthorized' })
    }
    return
  }

  // Skip company access verification for mock session
  console.log('requireCompanyAccess: Company access verified (mock), proceeding to:', to.path)
  next()
}

const redirectIfAuthenticated = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }

  next()
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public routes
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      beforeEnter: redirectIfAuthenticated,
      meta: { layout: 'auth' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      beforeEnter: redirectIfAuthenticated,
      meta: { layout: 'auth' },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      beforeEnter: redirectIfAuthenticated,
      meta: { layout: 'auth' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
      beforeEnter: redirectIfAuthenticated,
      meta: { layout: 'auth' },
    },

    // Company selection (authenticated but no company selected)
    {
      path: '/company-select',
      name: 'company-select',
      component: () => import('@/views/CompanySelectView.vue'),
      beforeEnter: requireAuth,
      meta: { layout: 'auth' },
    },

    // Protected routes (require authentication and company access)
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      beforeEnter: requireCompanyAccess,
      meta: {
        layout: 'main',
        title: 'Dashboard',
        permission: 'dashboard.view',
      },
    },
    {
      path: '/dashboard-demo',
      name: 'dashboard-demo',
      component: () => import('@/views/DashboardDemoView.vue'),
      beforeEnter: requireCompanyAccess,
      meta: {
        layout: 'main',
        title: 'Dashboard Demo',
      },
    },
    {
      path: '/ui-demo',
      name: 'ui-demo',
      component: () => import('@/views/UIComponentsDemo.vue'),
      beforeEnter: requireCompanyAccess,
      meta: {
        layout: 'main',
        title: 'UI Components Demo',
      },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('@/views/inventory/InventoryView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('inventory.view')],
      meta: {
        layout: 'main',
        title: 'Inventory Management',
        permission: 'inventory.view',
      },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('@/views/ProductsView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('products.view')],
      meta: {
        layout: 'main',
        title: 'Products',
        permission: 'products.view',
      },
    },
    {
      path: '/warehouse',
      name: 'warehouse',
      component: () => import('@/views/WarehouseView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('warehouse.view')],
      meta: {
        layout: 'main',
        title: '3D Warehouse',
        permission: 'warehouse.view',
      },
    },
    {
      path: '/sales',
      name: 'sales',
      component: () => import('@/views/sales/SalesView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('sales.view')],
      meta: {
        layout: 'main',
        title: 'Sales',
        permission: 'sales.view',
      },
    },
    {
      path: '/purchases',
      name: 'purchases',
      component: () => import('@/views/purchases/PurchasesView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('purchases.view')],
      meta: {
        layout: 'main',
        title: 'Purchases',
        permission: 'purchases.view',
      },
    },
    {
      path: '/pos',
      name: 'pos',
      component: () => import('@/views/pos/POSView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('pos.access')],
      meta: {
        layout: 'main',
        title: 'Point of Sale',
        permission: 'pos.access',
      },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/views/reports/ReportsView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('reports.view')],
      meta: {
        layout: 'main',
        title: 'Reports',
        permission: 'reports.view',
      },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      beforeEnter: requireCompanyAccess,
      meta: {
        layout: 'main',
        title: 'Notifications',
      },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      beforeEnter: [requireCompanyAccess, requirePermission('settings.view')],
      meta: {
        layout: 'main',
        title: 'Settings',
        permission: 'settings.view',
      },
    },

    // Error routes
    {
      path: '/unauthorized',
      name: 'unauthorized',
      component: () => import('@/views/errors/UnauthorizedView.vue'),
      meta: { layout: 'error' },
    },
    {
      path: '/error',
      name: 'error',
      component: () => import('@/views/errors/ErrorView.vue'),
      meta: { layout: 'error' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/errors/NotFoundView.vue'),
      meta: { layout: 'error' },
    },
  ],
})

// Global navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  console.log('Global guard - navigating from', from.path, 'to', to.path)
  console.log('Global guard auth state:', {
    loading: authStore.loading,
    isAuthenticated: authStore.isAuthenticated,
    hasUser: !!authStore.user,
    hasSession: !!authStore.session,
  })

  // Always wait for auth initialization to complete
  if (authStore.loading) {
    console.log('Global guard: Waiting for auth initialization...')
    let attempts = 0
    while (authStore.loading && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
      if (attempts % 10 === 0) {
        console.log(`Global guard: Still waiting... attempt ${attempts}`)
      }
    }
    console.log('Global guard: Auth initialization completed, state:', {
      loading: authStore.loading,
      isAuthenticated: authStore.isAuthenticated,
      hasUser: !!authStore.user,
      hasSession: !!authStore.session,
    })
  }

  // Set page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - ERP System`
  } else {
    document.title = 'ERP System'
  }

  next()
})

// Export route guards for use in other files
export { requireAuth, requirePermission, requireCompanyAccess, redirectIfAuthenticated }

export default router
