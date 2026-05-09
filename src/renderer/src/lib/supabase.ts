import {
  createClient,
  type SupabaseClient as SbClient,
  type SupabaseClientOptions,
} from '@supabase/supabase-js'
import type { Database } from '../../../shared/database.types'

/**
 * In-memory mirror so the synchronous parts of the GoTrue lifecycle don't
 * deadlock on first paint. Supabase's `Storage` interface technically allows
 * Promise return values, and the official client awaits them, so the async
 * delegate to `window.api.store` is fine for actual persistence.
 */
const memoryCache = new Map<string, string>()

const customStorage = {
  async getItem(key: string): Promise<string | null> {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) ?? null
    }
    try {
      const value = await window.api.store.get(key)
      if (typeof value === 'string') {
        memoryCache.set(key, value)
        return value
      }
      return null
    } catch (err) {
      console.error('[supabase] storage.getItem failed', err)
      return null
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    memoryCache.set(key, value)
    try {
      await window.api.store.set(key, value, { encrypt: true })
    } catch (err) {
      console.error('[supabase] storage.setItem failed', err)
    }
  },
  async removeItem(key: string): Promise<void> {
    memoryCache.delete(key)
    try {
      await window.api.store.delete(key)
    } catch (err) {
      console.error('[supabase] storage.removeItem failed', err)
    }
  },
}

const options: SupabaseClientOptions<'public'> = {
  auth: {
    storage: customStorage,
    storageKey: 'sb-rodopav-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'rodopav-desktop',
    },
  },
}

/**
 * Cliente Supabase. Sai do código a URL/key — agora vem do main process via
 * `window.api.config.getSupabase()` no bootstrap. Antes de chamar `initSupabase`
 * qualquer acesso ao client lança erro descritivo.
 *
 * Uso: na renderer, o `<ConfigGate>` em `main.tsx` chama `initSupabase()`
 * antes de renderizar `<App />`.
 */
let _client: SbClient<Database> | null = null

export function initSupabase(url: string, key: string): SbClient<Database> {
  if (_client) return _client
  if (!url || !key) {
    throw new Error('Credenciais Supabase ausentes (url/key).')
  }
  _client = createClient<Database>(url, key, options)
  return _client
}

export function isSupabaseInitialized(): boolean {
  return _client !== null
}

/**
 * Proxy transparente: qualquer acesso a `supabase.x` lê do client real,
 * permitindo que os imports estáticos funcionem sem refactor em todo callsite.
 * Erros caso o client não esteja inicializado.
 */
export const supabase = new Proxy({} as SbClient<Database>, {
  get(_target, prop, receiver) {
    if (!_client) {
      throw new Error(
        'Supabase ainda não foi configurado. Reinicie o app e configure URL/Key.',
      )
    }
    return Reflect.get(_client, prop, receiver)
  },
})

export type SupabaseClient = SbClient<Database>
