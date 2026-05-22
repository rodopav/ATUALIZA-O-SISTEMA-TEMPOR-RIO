import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// SW registrado pelo vite-plugin-pwa em registerType: 'autoUpdate'.
// Funciona automaticamente em prod (build), em dev é no-op.

const root = document.getElementById('root')
if (!root) throw new Error('div#root ausente no index.html')
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
