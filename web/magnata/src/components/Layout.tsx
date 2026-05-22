import * as React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar, MobileMenuButton } from './Sidebar'
import { useAuth } from '../lib/auth-store'

/**
 * Layout principal. Sidebar fixa em desktop (>=lg), drawer em mobile/tablet.
 * Conteúdo das rotas filho fica em <Outlet />.
 */
export function Layout(): React.ReactElement {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const { profile } = useAuth()

  return (
    <div className="min-h-dvh">
      <Sidebar mobileOpen={menuOpen} onMobileClose={() => setMenuOpen(false)} />

      <div className="lg:pl-72">
        {/* Top bar mobile — só aparece em <lg.
            pt-[max(...)] usa arbitrary values do Tailwind, garantindo que o
            padding-top respeite env(safe-area-inset-top) sem ser sobrescrito
            pelo py-2 (utility tem prioridade sobre component). Sem isso o
            header gruda atrás do notch/status bar do iOS standalone. */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-800/60 bg-zinc-950/80 px-3 pb-2 backdrop-blur lg:hidden"
          style={{
            paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex items-center gap-2">
            <MobileMenuButton onClick={() => setMenuOpen(true)} />
            <div className="flex items-center gap-2">
              <img src="/icon-192.png" alt="Rodopav" className="h-7 w-7 rounded-md" />
              <span className="text-sm font-bold text-zinc-100">Magnata</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amb-400">
              {profile?.nome_completo?.split(' ')[0] ?? 'cfo'}
            </p>
          </div>
        </header>

        <main
          className="px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          }}
        >
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
