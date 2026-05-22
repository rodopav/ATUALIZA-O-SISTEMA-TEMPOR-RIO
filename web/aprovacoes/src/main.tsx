import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './styles.css'

// SW registrado manualmente (não auto) pra capturar erros + permitir Push.
if ('serviceWorker' in navigator) {
  void registerSW({
    immediate: true,
    onRegisterError(err) {
      console.warn('[sw] register error:', err)
    },
  })
}

const root = document.getElementById('root')
if (!root) throw new Error('div#root ausente no index.html')
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
