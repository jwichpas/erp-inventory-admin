import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn('⚠️  Missing Supabase environment variables. App will work in limited development mode.')
    console.warn('💡 To use real data, ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file')
  }
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Set up auth state change handler for RLS context
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    // Set user context for RLS policies
    supabase
      .rpc('set_user_context', { user_id: session.user.id } as any)
      .then(() => {
        // Context set successfully
      })
      .catch((error) => {
        console.error('Failed to set user context:', error)
      })
  }
})
