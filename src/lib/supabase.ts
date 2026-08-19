import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false

  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

const supabaseUrl = isValidSupabaseUrl(rawSupabaseUrl) ? rawSupabaseUrl : undefined
const supabaseAnonKey = rawSupabaseAnonKey || undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('As variáveis de ambiente do Supabase não foram configuradas. O sistema utilizará o modo de armazenamento local (localStorage).')
}

// Pass standard fallback values to prevent createClient from throwing an uncaught exception on initialization if env vars are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
