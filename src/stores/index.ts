// Export all stores
export { useAuthStore } from './auth'
export { useCompanyStore } from './company'
export { createBaseStore } from './base'

// Store initialization
import { useAuthStore } from './auth'

export const initializeStores = async () => {
  const authStore = useAuthStore()
  await authStore.initialize()
}
