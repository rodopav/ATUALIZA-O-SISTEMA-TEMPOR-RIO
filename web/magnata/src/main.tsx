import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// __APP_BUILD_TIME__ vem do vite.config.ts (define). É um ISO string
// novo a cada deploy. Se o que está em localStorage diferir, o usuário
// está com bundle antigo cacheado pelo SW + tem SW velho ativo.
declare const __APP_BUILD_TIME__: string

const VERSION_KEY = 'rodopav-magnata-build'
const RELOAD_FLAG = 'rodopav-magnata-cleanup-reloaded'

async function nuclearCleanup(): Promise<void> {
  // Desregistra TODOS os SWs (não importa o scriptURL)
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
    } catch (e) {
      console.warn('[boot] sw unregister falhou:', e)
    }
  }
  // Limpa TODOS os caches workbox / runtime
  if ('caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
    } catch (e) {
      console.warn('[boot] caches.delete falhou:', e)
    }
  }
}

async function bootGate(): Promise<void> {
  const prev = localStorage.getItem(VERSION_KEY)
  const current = __APP_BUILD_TIME__

  // Primeiro acesso desse dispositivo na versão atual?
  if (prev !== current) {
    console.log('[boot] build mudou', { prev, current })
    // Guard: se já reloademos na sessão atual, NÃO reload de novo (anti-loop)
    if (sessionStorage.getItem(RELOAD_FLAG)) {
      console.warn('[boot] cleanup já rodou nessa sessão, prosseguindo sem reload')
      localStorage.setItem(VERSION_KEY, current)
      sessionStorage.removeItem(RELOAD_FLAG)
      return
    }
    sessionStorage.setItem(RELOAD_FLAG, '1')
    await nuclearCleanup()
    localStorage.setItem(VERSION_KEY, current)
    // Reload pra carregar tudo fresh do servidor (sem SW interceptando)
    window.location.reload()
    // Aguarda reload — Promise nunca resolve
    await new Promise(() => {})
  } else {
    // Versão bate — limpa flag de reload (caso restou da última sessão)
    sessionStorage.removeItem(RELOAD_FLAG)
  }
}

// Roda o boot gate ANTES de montar o React. Se precisar limpar, reload
// acontece e o React nunca monta nessa sessão.
void (async () => {
  await bootGate()
  const root = document.getElementById('root')
  if (!root) throw new Error('div#root ausente no index.html')
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})()
