// Application configuration
export const appConfig = {
  // Development mode - set to false for production
  isDevelopment: import.meta.env.DEV,

  // Mock data configuration
  // IMPORTANT: Para usar datos reales de Supabase:
  // 1. Cambiar useMockAuth a false
  // 2. Cambiar useMockData a false
  // 3. Configurar las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
  // 4. Asegurarse de que la base de datos tenga las tablas y datos necesarios
  useMockAuth: false, // Set to false to use real Supabase authentication
  useMockData: false, // Set to false to use real database data

  // Default company for development
  defaultCompanyId: '550e8400-e29b-41d4-a716-446655440000',

  // API configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },

  // Feature flags
  features: {
    multiCompany: true,
    realTimeUpdates: true,
    fileUploads: true,
    notifications: true,
  },
}

// Helper function to check if we're using mock data
export const isMockMode = () => appConfig.useMockAuth || appConfig.useMockData

// Helper function to get current environment
export const getEnvironment = () => {
  if (appConfig.isDevelopment) return 'development'
  return 'production'
}
