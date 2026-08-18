import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('As variáveis de ambiente do Supabase não foram configuradas. O sistema utilizará o modo de armazenamento local (localStorage).')
}

// Pass standard fallback values to prevent createClient from throwing an uncaught exception on initialization if env vars are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)