import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Lưu session trong localStorage
    autoRefreshToken: true,     // Tự refresh token trước khi hết hạn
    detectSessionInUrl: true,   // Bắt OAuth callback từ URL
  },
})

export type SupabaseClient = typeof supabase
