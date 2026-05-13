import * as React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Crown,
  Eye,
  Wallet,
  TrendingUp,
  Building2,
  PieChart,
  Activity,
  Sparkles,
  ListChecks,
  CloudDownload,
  MessageSquare,
  X,
} from 'lucide-react'
import { useAuthStore } from '../lib/auth-store'
import { Button } from './ui/button'
import { cn } from '../lib/cn'
import { MagnataTopbar } from './layout/MagnataTopbar'
import { useSessionRedirect } from '../lib/use-session-redirect'
import { useChatRealtime } from '../lib/use-chat-realtime'

interface MagnataNavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const NAV: MagnataNavItem[] = [
  { to: '/magnata', label: 'Visão Geral', icon: Eye, end: true },
  { to: '/magnata/liquidez', label: 'Liquidez', icon: Wallet },
  { to: '/magnata/fluxo', label: 'Fluxo de Caixa', icon: TrendingUp },
  { to: '/magnata/empresas', label: 'Empresas', icon: Building2 },
  { to: '/magnata/centros-custo', label: 'Centros de Custo', icon: PieChart },
  { to: '/magnata/saude', label: 'Saúde do Sistema', icon: Activity },
  { to: '/magnata/tendencias', label: 'Tendências', icon: Sparkles },
  { to: '/magnata/lancamentos', label: 'Lançamentos', icon: ListChecks },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/atualizacoes', label: 'Atualizações', icon: CloudDownload },
]

export function MagnataLayout(): React.ReactElement {
  useSessionRedirect()
  useChatRealtime({ activeOtherUserId: null })
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const logout = useAuthStore((s) => s.logout)
  const loading = useAuthStore((s) => s.loading)
  const [version, setVersion] = React.useState<string>('')
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    let active = true
    void window.api
      .getVersion()
      .then((v) => {
        if (active) setVersion(v)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const handleLogout = React.useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 bg-asf-950 text-sidebar-foreground md:flex md:flex-col">
        <MagnataSidebar version={version} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-asf-950 text-sidebar-foreground shadow-xl">
            <MagnataSidebar
              version={version}
              onClose={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <MagnataTopbar
          profile={profile}
          loading={loading}
          onLogout={() => void handleLogout()}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

interface MagnataSidebarProps {
  version: string
  onClose?: () => void
  onNavigate?: () => void
}

function MagnataSidebar({
  version,
  onClose,
  onNavigate,
}: MagnataSidebarProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-asf-800 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amb-300 to-amb-500 text-asf-950 ring-1 ring-amb-400/40">
            <Crown className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-sidebar-foreground">
              Magnata Dashboard
            </p>
            <p className="text-[11px] text-amb-300/80">Visão executiva</p>
          </div>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar menu"
            onClick={onClose}
            className="h-8 w-8 text-sidebar-foreground hover:bg-asf-800 hover:text-sidebar-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amb-300/60">
          Painéis
        </p>
        <ul className="space-y-0.5">
          {NAV.map((item) => (
            <li key={item.to}>
              <MagnataNavLink item={item} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-asf-800 px-5 py-4">
        <p className="text-[11px] text-amb-300/60">
          Magnata Dashboard · v{version || '0.6.0'}
        </p>
      </div>
    </div>
  )
}

function MagnataNavLink({
  item,
  onNavigate,
}: {
  item: MagnataNavItem
  onNavigate?: () => void
}): React.ReactElement {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-amb-400/15 text-sidebar-foreground shadow-sm ring-1 ring-amb-400/30'
            : 'text-sidebar-foreground/70 hover:bg-asf-800 hover:text-sidebar-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-amb-400"
            />
          ) : null}
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-amb-300' : 'text-sidebar-foreground/60',
            )}
          />
          <span className="flex-1 truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}
