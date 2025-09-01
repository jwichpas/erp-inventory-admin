<template>
  <aside :class="[
    'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
    isOpen ? 'translate-x-0' : '-translate-x-full'
  ]">
    <!-- Sidebar Header -->
    <div class="flex items-center justify-between h-16 px-6 border-b border-gray-200">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <img class="h-8 w-8" src="../../assets/images/app/mini-logo.svg" alt="ERP System" />
        </div>
        <div class="ml-3">
          <h1 class="text-lg font-semibold text-gray-900">ERP System</h1>
        </div>
      </div>
      <button @click="$emit('toggle')"
        class="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
        <XIcon class="h-6 w-6" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="mt-6 px-3">
      <div class="space-y-1">
        <router-link v-for="item in visibleNavigationItems" :key="item.name" :to="item.href" :class="[
          'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
          isActiveRoute(item.href)
            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
        ]">
          <component :is="item.icon" :class="[
            'mr-3 h-5 w-5 flex-shrink-0',
            isActiveRoute(item.href)
              ? 'text-blue-500'
              : 'text-gray-400 group-hover:text-gray-500'
          ]" />
          {{ item.name }}
          <span v-if="item.badge"
            class="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-red-100 text-red-800">
            {{ item.badge }}
          </span>
        </router-link>
      </div>

      <!-- Secondary Navigation -->
      <div v-if="visibleManagementItems.length > 0" class="mt-8">
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Administración
        </h3>
        <div class="mt-2 space-y-1">
          <router-link v-for="item in visibleManagementItems" :key="item.name" :to="item.href" :class="[
            'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
            isActiveRoute(item.href)
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          ]">
            <component :is="item.icon" :class="[
              'mr-3 h-5 w-5 flex-shrink-0',
              isActiveRoute(item.href)
                ? 'text-blue-500'
                : 'text-gray-400 group-hover:text-gray-500'
            ]" />
            {{ item.name }}
          </router-link>
        </div>
      </div>

      <!-- Development Navigation -->
      <div v-if="visibleDevelopmentItems.length > 0" class="mt-8">
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Desarrollo
        </h3>
        <div class="mt-2 space-y-1">
          <router-link v-for="item in visibleDevelopmentItems" :key="item.name" :to="item.href" :class="[
            'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
            isActiveRoute(item.href)
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          ]">
            <component :is="item.icon" :class="[
              'mr-3 h-5 w-5 flex-shrink-0',
              isActiveRoute(item.href)
                ? 'text-blue-500'
                : 'text-gray-400 group-hover:text-gray-500'
            ]" />
            {{ item.name }}
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Environment Indicator -->
    <div v-if="!authStore.isAuthenticated" class="absolute bottom-16 left-0 right-0 p-3 bg-yellow-50 border-t border-yellow-200">
      <div class="text-xs text-yellow-800">
        <div class="font-medium">🔧 Development Mode</div>
        <div class="text-yellow-700">Using real Supabase data</div>
        <div class="text-yellow-600">Login to see full features</div>
      </div>
    </div>

    <!-- User Info -->
    <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span class="text-sm font-medium text-white">
              {{ userInitials }}
            </span>
          </div>
        </div>
        <div class="ml-3 flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ authStore.user?.user_metadata?.full_name || authStore.user?.email }}
          </p>
          <p class="text-xs text-gray-500 truncate">
            {{ companyStore.currentCompanyName }}
          </p>
        </div>
      </div>
    </div>
  </aside>

  <!-- Overlay for mobile -->
  <div v-if="isOpen" class="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" @click="$emit('toggle')"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { usePermissions } from '@/composables/usePermissions'
import {
  Home as HomeIcon,
  Package as BoxIcon,
  ShoppingCart as ShoppingCartIcon,
  BarChart as BarChartIcon,
  FileText as FileTextIcon,
  Settings as SettingsIcon,
  Users as UsersIcon,
  Building as BuildingIcon,
  X as XIcon,
  Palette as PaletteIcon,
} from 'lucide-vue-next'

interface Props {
  isOpen: boolean
}

defineProps<Props>()
defineEmits<{
  toggle: []
}>()

const route = useRoute()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const permissions = usePermissions()

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    permission: 'dashboard.view'
  },
  {
    name: 'Inventario',
    href: '/inventory',
    icon: BoxIcon,
    permission: 'inventory.view'
  },
  {
    name: 'Productos',
    href: '/products',
    icon: BoxIcon,
    permission: 'products.view'
  },
  {
    name: 'Ventas',
    href: '/sales',
    icon: ShoppingCartIcon,
    permission: 'sales.view'
  },
  {
    name: 'Compras',
    href: '/purchases',
    icon: FileTextIcon,
    permission: 'purchases.view'
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: BarChartIcon,
    permission: 'reports.view'
  },
]

const managementItems = [
  {
    name: 'Usuarios',
    href: '/users',
    icon: UsersIcon,
    permission: 'users.manage'
  },
  {
    name: 'Empresas',
    href: '/companies',
    icon: BuildingIcon,
    permission: 'companies.manage'
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: SettingsIcon,
    permission: 'settings.manage'
  },
]

const developmentItems = [
  {
    name: 'Componentes UI',
    href: '/ui-demo',
    icon: PaletteIcon,
    permission: null // No permission required for UI demo
  },
]

// Filter navigation items based on permissions
const visibleNavigationItems = computed(() => {
  // In development mode, show basic routes even without full authentication
  if (import.meta.env.DEV && !authStore.isAuthenticated) {
    return navigationItems.filter(item => 
      ['dashboard.view', 'products.view', 'inventory.view', 'sales.view'].includes(item.permission)
    )
  }
  
  // If user is authenticated, show all navigation items regardless of permissions
  if (authStore.isAuthenticated) {
    return navigationItems
  }
  
  return navigationItems.filter(item =>
    !item.permission || permissions.hasPermission(item.permission)
  )
})

const visibleManagementItems = computed(() => {
  // Only show management items when fully authenticated
  if (!authStore.isAuthenticated) return []
  
  // If user is authenticated, show all management items regardless of permissions
  return managementItems
})

const visibleDevelopmentItems = computed(() => {
  // Development items are always visible in dev mode
  if (import.meta.env.DEV) {
    return developmentItems
  }
  
  return developmentItems.filter(item =>
    !item.permission || permissions.hasPermission(item.permission)
  )
})

const userInitials = computed(() => {
  const name = authStore.user?.user_metadata?.full_name || authStore.user?.email || 'U'
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
})

const isActiveRoute = (href: string) => {
  return route.path.startsWith(href)
}
</script>
