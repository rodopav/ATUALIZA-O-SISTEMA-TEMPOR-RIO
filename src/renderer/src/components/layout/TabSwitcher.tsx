import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutGrid, X as XIcon } from 'lucide-react'
import { useTabsStore, type AppTab } from '../../lib/tabs-store'
import { iconFromName } from '../../lib/tab-resolver'
import { cn } from '../../lib/cn'

interface TabSwitcherProps {
  open: boolean
  onClose: () => void
}

/**
 * Overlay estilo "Alt+Tab" do Windows mostrando todas as abas abertas.
 * - Setas / Tab pra navegar
 * - Enter pra selecionar
 * - Esc pra fechar
 * - Click pra selecionar direto
 *
 * Ordem: tabs com `lastVisitedAt` mais recente primeiro (MRU), igual
 * o Alt+Tab do Windows.
 */
export function TabSwitcher({
  open,
  onClose,
}: TabSwitcherProps): React.ReactElement | null {
  const navigate = useNavigate()
  const location = useLocation()
  const tabs = useTabsStore((s) => s.tabs)
  const lastVisitedAt = useTabsStore((s) => s.lastVisitedAt)
  const closeTab = useTabsStore((s) => s.closeTab)

  // Ordena por MRU (mais recente primeiro), excluindo a ativa do topo
  const ordered = React.useMemo<AppTab[]>(() => {
    const others = tabs.filter((t) => t.path !== location.pathname)
    const active = tabs.find((t) => t.path === location.pathname)
    const sorted = [...others].sort((a, b) => {
      const at = lastVisitedAt[a.path] ?? 0
      const bt = lastVisitedAt[b.path] ?? 0
      return bt - at
    })
    // A ativa fica no topo só pra dar contexto; o cursor começa na próxima
    return active ? [active, ...sorted] : sorted
  }, [tabs, lastVisitedAt, location.pathname])

  // Por padrão, foca a SEGUNDA aba (a "próxima" — UX igual Alt+Tab)
  const [cursor, setCursor] = React.useState(0)
  React.useEffect(() => {
    if (open) {
      setCursor(ordered.length > 1 ? 1 : 0)
    }
  }, [open, ordered.length])

  // Handler de tecla quando o switcher tá aberto
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (
        e.key === 'Tab' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault()
        setCursor((c) =>
          ordered.length === 0 ? 0 : (c + 1) % ordered.length,
        )
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setCursor((c) =>
          ordered.length === 0
            ? 0
            : (c - 1 + ordered.length) % ordered.length,
        )
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const chosen = ordered[cursor]
        if (chosen) {
          navigate(chosen.path)
        }
        onClose()
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, ordered, cursor, navigate, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-label="Trocar de aba"
    >
      <div
        className="w-[min(640px,90vw)] overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Abas abertas
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            ↑↓ navega · Enter abre · Esc fecha
          </span>
        </div>

        {ordered.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma aba aberta.
          </div>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto p-1">
            {ordered.map((tab, idx) => {
              const Icon = iconFromName(tab.iconName)
              const focused = idx === cursor
              const isActive = tab.path === location.pathname
              return (
                <li key={tab.path}>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(tab.path)
                      onClose()
                    }}
                    onMouseEnter={() => setCursor(idx)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      focused
                        ? 'bg-primary/15 text-foreground ring-1 ring-primary/40'
                        : 'text-foreground/90 hover:bg-muted',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        focused ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tab.label}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {tab.path}
                      </p>
                    </div>
                    {isActive ? (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Ativa
                      </span>
                    ) : null}
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={`Fechar ${tab.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        const next = closeTab(tab.path)
                        if (tab.path === location.pathname) {
                          navigate(next ?? '/dashboard')
                          onClose()
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          const next = closeTab(tab.path)
                          if (tab.path === location.pathname) {
                            navigate(next ?? '/dashboard')
                            onClose()
                          }
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
