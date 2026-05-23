import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// ★ KILL SWITCH: desregistra SW antigos que NÃO sejam da build atual.
// Antes do registerSW do vite-plugin-pwa rodar, garantimos que SWs
// instalados em versões passadas sumam — eles podem estar interceptando
// requests pro Supabase ou servindo HTML obsoleto.
async function cleanupStaleServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    // O nome do SW gerado pelo vite-plugin-pwa é "sw.js" na raiz.
    // Desregistra QUALQUER SW que não tenha scope/script novo.
    // Em PWA bem-comportado isso é no-op (SW novo já está OK).
    // Se um SW corrompido travar requests, isso libera.
    for (const reg of regs) {
      const scriptURL = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? ''
      if (scriptURL && !scriptURL.endsWith('/sw.js')) {
        console.warn('[sw-cleanup] desregistrando SW desconhecido:', scriptURL)
        await reg.unregister()
      }
    }
  } catch (e) {
    console.warn('[sw-cleanup] falha:', e)
  }
}
void cleanupStaleServiceWorkers()

const root = document.getElementById('root')
if (!root) throw new Error('div#root ausente no index.html')
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
