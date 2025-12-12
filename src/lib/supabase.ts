import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isValidUrl = (url: string | undefined) => {
    try {
        return url && new URL(url)
    } catch {
        return false
    }
}

// Prevent crash if variables are missing
export const isSupabaseConfigured = isValidUrl(supabaseUrl) && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : createClient('https://setup-project-in-settings.supabase.co', 'placeholder-key')

if (!isSupabaseConfigured) {
    console.error('Supabase credentials missing or invalid. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}
