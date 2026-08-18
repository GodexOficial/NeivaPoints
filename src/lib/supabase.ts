import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (
    supabaseUrl.includes("your_supabase_url_here") ||
    supabaseAnonKey.includes("your_supabase_anon_key_here") ||
    supabaseUrl.trim() === "" ||
    supabaseAnonKey.trim() === ""
  ) {
    return false;
  }
  return true;
};

// Safe dummy URL to prevent createClient initialization crash if env vars are missing
const validUrl = isSupabaseConfigured()
  ? supabaseUrl!
  : "https://placeholder-url.supabase.co";
const validKey = isSupabaseConfigured()
  ? supabaseAnonKey!
  : "placeholder-anon-key";

export const supabase = createClient(validUrl, validKey);
