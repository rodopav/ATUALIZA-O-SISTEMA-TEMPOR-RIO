import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getConfig } from './config'

// Cliente lazy — só instancia quando a config existe. Se o usuário trocar
// URL/key via SetupConfig, chama `resetSupabaseClient()` pra rebuildar.
let _client: SupabaseClient | null = null
let _builtFor: string | null = null

function build(): SupabaseClient {
  const cfg = getConfig()
  if (!cfg) {
    // Cliente "vazio" — só pra evitar crash caso algo seja chamado antes do gate.
    return createClient('https://invalid.invalid', 'invalid', {
      auth: { persistSession: false },
    })
  }
  return createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // FALSO porque não usamos OAuth/magic link. Quando true e a URL tem
      // hash ou query strings residuais (volta do SW, refresh, etc.), Supabase
      // tenta processar como callback OAuth e pode entrar em loop tentando
      // limpar a URL. Login é email+senha, não precisa detectar nada na URL.
      detectSessionInUrl: false,
      // Storage key fixa: a sessão persiste entre reloads e re-instalações do PWA.
      storageKey: 'rodopav-magnata-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
    },
  })
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const cfg = getConfig()
    const key = cfg?.url ?? null
    if (!_client || _builtFor !== key) {
      _client = build()
      _builtFor = key
    }
    const value = Reflect.get(_client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(_client) : value
  },
})

export function resetSupabaseClient(): void {
  _client = null
  _builtFor = null
}
