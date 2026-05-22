import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Eye,
  Droplets,
  TrendingUp,
  Building2,
  PieChart,
  Activity,
  LineChart,
  ListChecks,
  Menu,
  X,
  LogOut,
  Settings,
} from 'lucide-react'
import { signOut, useAuth } from '../lib/auth-store'
import { clearConfig } from '../lib/config'
import { resetSupabaseClient } from '../lib/supabase'
import { cn } from '../lib/cn'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  { to: '/', label: 'Visão geral', icon: <Eye className="h-4 w-4" /> },
  { to: '/liquidez', label: 'Liquidez', icon: <Droplets className="h-4 w-4" /> },
  { to: '/fluxo', label: 'Fluxo de caixa', icon: <TrendingUp className="h-4 w-4" /> },
  { to: '/empresas', label: 'Empresas', icon: <Building2 className="h-4 w-4" /> },
  { to: '/centros-custo', label: 'Centros de custo', icon: <PieChart className="h-4 w-4" /> },
  { to: '/saude', label: 'Saúde do sistema', icon: <Activity className="h-4 w-4" /> },
  { to: '/tendencias', label: 'Tendências', icon: <LineChart className="h-4 w-4" /> },
  { to: '/lancamentos', label: 'Lançamentos', icon: <ListChecks className="h-4 w-4" /> },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps): React.ReactElement {
  const { profile } = useAuth()
  const location = useLocation()

  // Fecha o drawer ao navegar em mobile
  React.useEffect(() => {
    onMobileClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const trocarConexao = (): void => {
    if (!confirm('Trocar de conexão Supabase? Você precisará fazer login novamente.')) return
    clearConfig()
    resetSupabaseClient()
    window.location.href = '/'
  }

  const sair = async (): Promise<void> => {
    await signOut()
    onMobileClose()
  }

  return (
    <>
      {/* Drawer overlay (mobile) */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur',
          'transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Brand — paddingTop com max() pro notch quando drawer mobile abre. */}
        <div
          className="flex items-center justify-between gap-2 border-b border-zinc-800/60 px-4 pb-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icon-192.png" alt="Rodopav" className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-amb-400">Rodopav</p>
              <h1 className="truncate text-sm font-bold leading-tight text-zinc-50">Magnata</h1>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="lg:hidden rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p className="px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[2px] text-zinc-600">Painéis</p>
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-amb-400/15 text-amb-300 shadow-[inset_3px_0_0_0_#F59E0B]'
                        : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100',
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info + actions */}
        <div className="border-t border-zinc-800/60 px-3 py-3 space-y-1">
          <div className="flex items-center gap-2.5 px-2 pb-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amb-400 text-zinc-950 text-xs font-extrabold">
              {(profile?.nome_completo ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-100">
                {profile?.nome_completo ?? '—'}
              </p>
              <p className="truncate text-[10px] uppercase tracking-wider text-zinc-500">
                {profile?.is_superadmin ? 'Superadmin' : profile?.role ?? 'usuário'}
              </p>
            </div>
          </div>
          <button
            onClick={trocarConexao}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100"
          >
            <Settings className="h-3 w-3" />
            Trocar conexão
          </button>
          <button
            onClick={() => void sair()}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-3 w-3" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}

/** Botão hambúrguer pra abrir o drawer em mobile. */
export function MobileMenuButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="lg:hidden rounded-md border border-zinc-800/60 bg-zinc-900/40 p-2 text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
