// Sincroniza route ↔ tabs e amarra os atalhos de teclado estilo navegador:
//   Ctrl+Tab          → próxima aba
//   Ctrl+Shift+Tab    → aba anterior
//   Ctrl+W            → fecha a aba ativa
//   Ctrl+1..9         → ir direto pra aba N
//   Alt+Tab           → abre o switcher (tentativa — Windows captura primeiro,
//                       então também aceita Ctrl+K como fallback documentado)
//   Ctrl+K            → abre o switcher
//
// Observação: Alt+Tab é interceptado pelo OS Windows antes de chegar
// no renderer. No main process (electron) configuramos before-input-event
// pra capturar quando a janela tá focada e dispara um IPC que aciona o
// mesmo handler do switcher.

import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTabsStore } from './tabs-store'
import { resolveTabForPath } from './tab-resolver'

interface UseTabShortcutsArgs {
  onOpenSwitcher: () => void
}

export function useTabRouteSync(): void {
  const location = useLocation()
  const ensureTab = useTabsStore((s) => s.ensureTab)
  const touch = useTabsStore((s) => s.touch)

  React.useEffect(() => {
    const resolved = resolveTabForPath(location.pathname)
    if (!resolved) return
    ensureTab({
      path: location.pathname,
      label: resolved.label,
      iconName: resolved.iconName,
    })
    touch(location.pathname)
  }, [location.pathname, ensureTab, touch])
}

export function useTabShortcuts({
  onOpenSwitcher,
}: UseTabShortcutsArgs): void {
  const navigate = useNavigate()
  const location = useLocation()
  const tabs = useTabsStore((s) => s.tabs)
  const closeTab = useTabsStore((s) => s.closeTab)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey

      // Ctrl+K → switcher
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenSwitcher()
        return
      }

      // Ctrl+Tab → switcher (não troca direto: mostra a "janelinha")
      if (mod && !e.altKey && e.key === 'Tab') {
        e.preventDefault()
        onOpenSwitcher()
        return
      }

      // Ctrl+W → fecha aba ativa
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        if (tabs.length === 0) return
        e.preventDefault()
        const next = closeTab(location.pathname)
        navigate(next ?? '/dashboard')
        return
      }

      // Ctrl+1..9 → vai direto pra aba N
      if (mod && !e.shiftKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        const idx = Number.parseInt(e.key, 10) - 1
        const target = tabs[idx]
        if (target) {
          e.preventDefault()
          navigate(target.path)
        }
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tabs, location.pathname, closeTab, navigate, onOpenSwitcher])
}

/**
 * Escuta o IPC que o main process dispara quando captura Alt+Tab via
 * before-input-event. Se chegar, abre o switcher.
 */
export function useAltTabFromMain(onOpenSwitcher: () => void): void {
  React.useEffect(() => {
    const api = (window as unknown as {
      api?: { onTabSwitcher?: (cb: () => void) => () => void }
    }).api
    if (!api?.onTabSwitcher) return
    const unsub = api.onTabSwitcher(() => {
      onOpenSwitcher()
    })
    return () => {
      unsub()
    }
  }, [onOpenSwitcher])
}
