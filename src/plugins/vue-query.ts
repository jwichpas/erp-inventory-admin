import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import type { App } from 'vue'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      retryDelay: 1000,
    },
  },
})

export function setupVueQuery(app: App) {
  app.use(VueQueryPlugin, {
    queryClient,
  })
}

export { queryClient }
