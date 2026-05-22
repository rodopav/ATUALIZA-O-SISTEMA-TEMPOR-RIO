import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// PWA usa env vars da Vercel — sem tela de config como no desktop.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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
      // Não usamos OAuth/magic-link aqui — login é email+senha. Quando true,
      // Supabase tenta processar hash residual (vinda de SW, push, etc.)
      // como callback e pode entrar em loop.
      detectSessionInUrl: false,
      storageKey: 'rodopav-aprovacoes-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  },
)
