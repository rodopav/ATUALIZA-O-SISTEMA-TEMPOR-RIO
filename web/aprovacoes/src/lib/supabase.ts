import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[supabase] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. ' +
    'Em dev, crie .env.local. Em prod, defina na Vercel.',
  )
}

/**
 * Lock no-op pro Supabase Auth — ver supabase.ts do Magnata.
 * navigator.locks default pode causar deadlock no PWA com session
 * existente, fazendo getSession() nunca resolver.
 */
const noopLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn()
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? 'http://localhost',
  SUPABASE_ANON_KEY ?? 'invalid',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'rodopav-aprovacoes-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      lock: noopLock,
    },
  },
)
