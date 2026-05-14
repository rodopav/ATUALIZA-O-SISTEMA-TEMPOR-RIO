import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, LayoutGrid } from 'lucide-react'
import { useTabsStore } from '../../lib/tabs-store'
import { iconFromName } from '../../lib/tab-resolver'
import { cn } from '../../lib/cn'

interface TabBarProps {
  onOpenSwitcher: () => void
}

/**
 * Barra de abas estilo navegador, ancorada no flex-1 do Topbar.
 * - Click na pill: navega
 * - X / botão do meio: fecha
 * - Pill ativa = pathname atual
 * - Botão à direita abre o switcher (Ctrl+Tab)
 */
export function TabBar({ onOpenSwitcher }: TabBarProps): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const tabs = useTabsStore((s) => s.tabs)
  const closeTab = useTabsStore((s) => s.closeTab)
  const scrollerRef = React.useRef<HTMLDivElement | null>(null)
  const activeRef = React.useRef<HTMLButtonElement | null>(null)

  // Auto-scroll: traz a aba ativa pro viewport quando muda a rota
  React.useEffect(() => {
    const el = activeRef.current
    if (el && scrollerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
    }
  }, [location.pathname])

  const handleClose = (
    e: React.MouseEvent | React.KeyboardEvent,
    path: string,
  ): void => {
    e.preventDefault()
    e.stopPropagation()
    const next = closeTab(path)
    // Se fechou a ativa, navega pra próxima (ou dashboard se vazio).
    if (path === location.pathname) {
      navigate(next ?? '/dashboard')
    }
  }

  const handleMiddleClick = (
    e: React.MouseEvent,
    path: string,
  ): void => {
    if (e.button === 1) {
      handleClose(e, path)
    }
  }

  if (tabs.length === 0) {
    return <div className="flex-1" />
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <div
        ref={scrollerRef}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1 overflow-x-auto',
          // Scrollbar fina, alinhada com o tema
          '[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5',
          '[&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border',
        )}
      >
        {tabs.map((tab) => {
          const Icon = iconFromName(tab.iconName)
          const active = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              ref={active ? activeRef : null}
              type="button"
              onClick={() => navigate(tab.path)}
              onAuxClick={(e) => handleMiddleClick(e, tab.path)}
              className={cn(
                'group inline-flex h-9 min-w-0 shrink-0 max-w-[200px] items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary/40 bg-primary/15 text-foreground shadow-sm'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground',
              )}
              title={tab.label}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span className="truncate">{tab.label}</span>
              <span
                role="button"
                aria-label={`Fechar ${tab.label}`}
                tabIndex={-1}
                onClick={(e) => handleClose(e, tab.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClose(e, tab.path)
                }}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors',
                  'opacity-60 hover:bg-foreground/10 hover:opacity-100',
                  active && 'opacity-80',
                )}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onOpenSwitcher}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs text-muted-foreground transition-colors',
          'hover:border-border hover:bg-muted/70 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        title="Trocar de aba (Ctrl+Tab)"
        aria-label="Abrir trocador de abas"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden font-mono text-[10px] tracking-wider md:inline">
          Ctrl+Tab
        </span>
      </button>
    </div>
  )
}
