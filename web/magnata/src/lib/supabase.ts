import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getConfig } from './config'

/**
 * Lock no-op pro Supabase Auth.
 *
 * Por padrão o Supabase JS usa navigator.locks pra prevenir race conditions
 * entre múltiplas abas / múltiplas chamadas concorrentes do auth (getSession,
 * refreshToken, etc.). Em alguns navegadores (PWA standalone, iOS, Edge com
 * SW velho), o lock fica preso e TODAS as chamadas subsequentes esperam
 * indefinidamente — getSession() nunca resolve.
 *
 * Substituir por um lock no-op (executa imediatamente sem coordenar entre
 * abas) corrige o deadlock. Risco mínimo pra single-tab apps: race entre
 * abas é improvável e o pior caso é um refresh token ser usado 2x (Supabase
 * trata isso gracefully).
 */
const noopLock = async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
  return await fn()
}

function build(): SupabaseClient {
  const cfg = getConfig()
  if (!cfg) {
    return createClient('https://invalid.invalid', 'invalid', {
      auth: { persistSession: false },
    })
  }
  return createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'rodopav-magnata-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // ★ FIX deadlock: ver comentário do noopLock acima.
      lock: noopLock,
    },
  })
}

// Singleton — uma instância pra toda a app. Mudar de config requer reload
// da página (clearConfig() + window.location.reload(), feito no Sidebar).
export const supabase: SupabaseClient = build()

/**
 * @deprecated mantido pra compatibilidade. Em vez de chamar isso, faça
 * `clearConfig(); window.location.reload()` — o singleton recria limpo
 * na próxima carga.
 */
export function resetSupabaseClient(): void {
  // No-op intencional. A app inteira é recriada via reload, não há
  // necessidade de trocar instância em runtime.
}
