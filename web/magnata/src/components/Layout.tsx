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
        {/* Top bar mobile — só aparece em <lg. safe-top respeita notch/status bar
            do iOS/Android quando o PWA roda em modo standalone (viewport-fit=cover). */}
        <header className="safe-top safe-x sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-800/60 bg-zinc-950/80 px-3 py-2 backdrop-blur lg:hidden">
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

        <main className="safe-x safe-bottom px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
