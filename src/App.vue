<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { setAppInitialized } from '@/router/index'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const route = useRoute()
const authStore = useAuthStore()
const isInitialized = ref(false)

const currentLayout = computed(() => {
  return route.meta.layout || 'default'
})

onMounted(async () => {
  try {
    console.log('App: Starting initialization...')

    // Add global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error)
      console.error('Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      event.preventDefault() // Prevent the default behavior (which might close the browser)
    })

    // Initialize auth store with error handling
    console.log('App: Initializing auth store...')
    await authStore.initialize()

    // Wait a bit more to ensure everything is settled
    await new Promise(resolve => setTimeout(resolve, 200))

    console.log('App: Initialization completed successfully, auth state:', {
      isAuthenticated: authStore.isAuthenticated,
      hasUser: !!authStore.user,
      hasSession: !!authStore.session,
      loading: authStore.loading
    })
  } catch (error) {
    console.error('App: Failed to initialize app:', error)
    // Don't rethrow the error to prevent app crash
  } finally {
    isInitialized.value = true
    setAppInitialized(true)
    console.log('App: Marked as initialized')
  }
})
</script>

<template>
  <div id="app">
    <!-- Loading screen while initializing -->
    <div v-if="!isInitialized" class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>

    <!-- App content after initialization -->
    <div v-else>
      <AppLayout v-if="currentLayout === 'main'">
        <RouterView />
      </AppLayout>

      <div v-else-if="currentLayout === 'auth'">
        <RouterView />
      </div>

      <div v-else-if="currentLayout === 'error'"
        class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <RouterView />
      </div>

      <div v-else>
        <RouterView />
      </div>
    </div>
  </div>
</template>
