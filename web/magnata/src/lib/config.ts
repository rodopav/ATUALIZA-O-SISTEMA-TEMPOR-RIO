// Configuração da conexão Supabase salva no localStorage do navegador.
// Igual ao desktop (electron-store) — o usuário digita URL + anon key uma vez.
// Se as env vars VITE_SUPABASE_* estiverem definidas no build (Vercel),
// elas são o default; se não, o app pede via tela SetupConfig.

const URL_KEY = 'rodopav.supabase.url'
const KEY_KEY = 'rodopav.supabase.anon_key'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

/**
 * Lê a config efetiva. Prioridade INVERTIDA pra reduzir vetor de
 * roubo de anon key via XSS / extensão maliciosa / screenshot:
 *
 *   1. Env var VITE_SUPABASE_* (gravada no build da Vercel, mesma origem do app)
 *   2. localStorage (fallback pra setup manual em ambiente sem env)
 *   3. null — força tela de setup
 *
 * Com env var no build, a anon key vai no bundle (padrão Supabase) e
 * NÃO é gravada no localStorage do browser do CFO. Mesmo que apareça
 * uma XSS no app, o atacante não consegue ler a chave do localStorage
 * (porque ela não está lá), apenas do bundle JS — que já é público.
 */
export function getConfig(): SupabaseConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey }

  const lsUrl = typeof window !== 'undefined' ? localStorage.getItem(URL_KEY) : null
  const lsKey = typeof window !== 'undefined' ? localStorage.getItem(KEY_KEY) : null
  if (lsUrl && lsKey) return { url: lsUrl, anonKey: lsKey }

  return null
}

export function saveConfig(cfg: SupabaseConfig): void {
  localStorage.setItem(URL_KEY, cfg.url.trim())
  localStorage.setItem(KEY_KEY, cfg.anonKey.trim())
}

export function clearConfig(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(KEY_KEY)
  // Também limpa sessão pra forçar login novo na próxima
  localStorage.removeItem('sb-auth-token')
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k)
  })
}

export function hasConfig(): boolean {
  return getConfig() !== null
}

/** Validação básica de URL Supabase: deve ser https://*.supabase.co */
export function isValidSupabaseUrl(url: string): boolean {
  const u = url.trim()
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(u)
}

/** Validação básica de anon key: JWT (3 partes separadas por ponto) ou sb_publishable_*. */
export function isValidAnonKey(key: string): boolean {
  const k = key.trim()
  if (k.startsWith('sb_publishable_')) return k.length > 20
  // JWT: eyJ... . eyJ... . <sig>
  const parts = k.split('.')
  return parts.length === 3 && parts[0].startsWith('eyJ')
}
