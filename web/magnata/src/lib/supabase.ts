import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// PWA usa env vars da Vercel — sem tela de config como no desktop.
// As 2 chaves estão definidas em Settings → Environment Variables na Vercel.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Mensagem clara em dev pra não perder tempo debugando "Failed to fetch"
  console.error(
    '[supabase] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. ' +
    'Em dev, crie .env.local. Em prod, defina na Vercel.',
  )
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? 'http://localhost',
  SUPABASE_ANON_KEY ?? 'invalid',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  },
)
