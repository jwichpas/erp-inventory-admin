<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
      <!-- Left side -->
      <div class="flex items-center">
        <!-- Mobile menu button -->
        <button @click="$emit('toggle-sidebar')"
          class="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
          <MenuIcon class="h-6 w-6" />
        </button>

        <!-- Breadcrumbs -->
        <nav class="hidden sm:flex ml-4 lg:ml-0" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-2">
            <li v-for="(crumb, index) in breadcrumbs" :key="crumb.name">
              <div class="flex items-center">
                <ChevronRightIcon v-if="index > 0" class="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                <router-link v-if="crumb.href && index < breadcrumbs.length - 1" :to="crumb.href"
                  class="text-sm font-medium text-gray-500 hover:text-gray-700">
                  {{ crumb.name }}
                </router-link>
                <span v-else class="text-sm font-medium text-gray-900">
                  {{ crumb.name }}
                </span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      <!-- Right side -->
      <div class="flex items-center space-x-4">
        <!-- Company Selector -->
        <CompanySelector v-if="companyStore.hasMultipleCompanies" />

        <!-- Notifications -->
        <div class="relative">
          <button @click="showNotifications = !showNotifications"
            class="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full">
            <BellIcon class="h-6 w-6" />
            <span v-if="notificationCount > 0"
              class="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {{ notificationCount > 9 ? '9+' : notificationCount }}
            </span>
          </button>

          <!-- Notifications Dropdown -->
          <div v-if="showNotifications"
            class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div class="p-4">
              <h3 class="text-lg font-medium text-gray-900">Notificaciones</h3>
              <div class="mt-4 space-y-3">
                <div v-for="notification in notifications" :key="notification.id"
                  class="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div class="flex-shrink-0">
                    <div class="h-2 w-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">
                      {{ notification.title }}
                    </p>
                    <p class="text-sm text-gray-500">
                      {{ notification.message }}
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                      {{ formatTime(notification.created_at) }}
                    </p>
                  </div>
                </div>
                <div v-if="notifications.length === 0" class="text-center py-4">
                  <p class="text-sm text-gray-500">No hay notificaciones nuevas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User Menu -->
        <div class="relative">
          <button @click="showUserMenu = !showUserMenu"
            class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100">
            <div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span class="text-sm font-medium text-white">
                {{ userInitials }}
              </span>
            </div>
            <div class="hidden md:block text-left">
              <p class="text-sm font-medium text-gray-900">
                {{ authStore.user?.user_metadata?.full_name || authStore.user?.email }}
              </p>
              <p class="text-xs text-gray-500">
                {{ companyStore.currentCompanyName }}
              </p>
            </div>
            <ChevronDownIcon class="h-4 w-4 text-gray-400" />
          </button>

          <!-- User Menu Dropdown -->
          <div v-if="showUserMenu"
            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div class="py-1">
              <router-link to="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                @click="showUserMenu = false">
                Tu Perfil
              </router-link>
              <router-link to="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                @click="showUserMenu = false">
                Configuración
              </router-link>
              <div class="border-t border-gray-100"></div>
              <button @click="handleSignOut"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Click outside to close dropdowns -->
  <div v-if="showNotifications || showUserMenu" class="fixed inset-0 z-40" @click="closeDropdowns"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import CompanySelector from '@/components/common/CompanySelector.vue'
import {
  MenuIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from 'lucide-vue-next'

defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()

const showNotifications = ref(false)
const showUserMenu = ref(false)

// Mock notifications for demo
const notifications = ref([
  {
    id: 1,
    title: 'Alerta de Stock Bajo',
    message: 'El producto "Widget A" tiene stock bajo',
    created_at: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: 2,
    title: 'Nueva Orden',
    message: 'Se ha creado la orden #12345',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
])

const notificationCount = computed(() => notifications.value.length)

const userInitials = computed(() => {
  const name = authStore.user?.user_metadata?.full_name || authStore.user?.email || 'U'
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
})

const breadcrumbs = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)
  const crumbs = [{ name: 'Inicio', href: '/dashboard' }]

  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`

    // Translate common segments to Spanish
    const translations: Record<string, string> = {
      'dashboard': 'Dashboard',
      'inventory': 'Inventario',
      'sales': 'Ventas',
      'purchases': 'Compras',
      'reports': 'Reportes',
      'users': 'Usuarios',
      'companies': 'Empresas',
      'settings': 'Configuración',
    }

    const name = translations[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

    if (index === pathSegments.length - 1) {
      crumbs.push({ name, href: undefined })
    } else {
      crumbs.push({ name, href: currentPath })
    }
  })

  return crumbs
})

const closeDropdowns = () => {
  showNotifications.value = false
  showUserMenu.value = false
}

const handleSignOut = async () => {
  try {
    await authStore.signOut()
    router.push('/login')
  } catch (error) {
    console.error('Sign out failed:', error)
  }
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) {
    return `${minutes}m`
  } else if (hours < 24) {
    return `${hours}h`
  } else {
    return `${days}d`
  }
}

// Close dropdowns on escape key
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeDropdowns()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
