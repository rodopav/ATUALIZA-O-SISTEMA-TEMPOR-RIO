/// <reference types="vite/client" />

// Supabase URL/key foram REMOVIDOS do build — agora vêm do main process via
// `window.api.config.getSupabase()` e ficam armazenadas criptografadas no
// keychain do OS (electron safeStorage).

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: 'user' | 'admin' | 'magnata'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
