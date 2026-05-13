import * as React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../lib/auth-store'
import { SidebarContent, type NavItem, type NavSection } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'
import {
  USER_OPERATION_BASE,
  USER_OPERATION_ADMIN_EXTRA,
  USER_CADASTROS_NAV,
  USER_ADMIN_NAV,
  IAM_NAV,
  ATUALIZACOES_NAV,
  CHAT_NAV,
} from './layout/nav-items'
import { pendentesCountQuery } from '../lib/solicitacoes-queries'
import {
  meusModulosQuery,
  type ModuloApp,
} from '../lib/modulos-queries'
import { useSessionRedirect } from '../lib/use-session-redirect'
import { unreadTotalQuery } from '../lib/chat-queries'
import { useChatRealtime } from '../lib/use-chat-realtime'

const APP_MODE = (import.meta.env.VITE_APP_MODE ?? 'user') as
  | 'user'
  | 'admin'
  | 'magnata'
const APP_TITLE =
  APP_MODE === 'admin' ? 'Rodopav Admin' : 'Rodopav Financeiro'

interface BuildSectionsArgs {
  isAdmin: boolean
  isSuperadmin: boolean
  pendentesCount: number
  chatUnread: number
  modulos: Set<ModuloApp> | undefined
}

function passModulo(
  item: NavItem,
  modulos: Set<ModuloApp> | undefined,
  isAdmin: boolean,
  isSuperadmin: boolean,
): boolean {
  if (isSuperadmin || isAdmin) return true
  if (!item.modulo) return true
  if (!modulos) return false
  return modulos.has(item.modulo as ModuloApp)
}

function buildSections({
  isAdmin,
  isSuperadmin,
  pendentesCount,
  chatUnread,
  modulos,
}: BuildSectionsArgs): NavSection[] {
  const chatNav: NavItem = {
    ...CHAT_NAV,
    badgeCount: chatUnread > 0 ? chatUnread : undefined,
  }
  if (APP_MODE === 'admin') {
    return [
      { label: 'Acesso', items: IAM_NAV },
      { label: 'Comunicação', items: [chatNav] },
      { label: 'Sistema', items: [ATUALIZACOES_NAV] },
    ]
  }
  const operationItemsAll = isAdmin
    ? [...USER_OPERATION_BASE, ...USER_OPERATION_ADMIN_EXTRA]
    : USER_OPERATION_BASE
  const operationItems = operationItemsAll.filter((it) =>
    passModulo(it, modulos, isAdmin, isSuperadmin),
  )
  const cadastrosItems = USER_CADASTROS_NAV.filter((it) =>
    passModulo(it, modulos, isAdmin, isSuperadmin),
  )
  const sections: NavSection[] = []
  if (operationItems.length) {
    sections.push({ label: 'Operação', items: operationItems })
  }
  if (cadastrosItems.length) {
    sections.push({ label: 'Cadastros', items: cadastrosItems })
  }
  if (isAdmin) {
    const adminItems: NavItem[] = USER_ADMIN_NAV.filter((it) =>
      passModulo(it, modulos, isAdmin, isSuperadmin),
    ).map((item) =>
      item.to === '/admin/solicitacoes'
        ? { ...item, badgeCount: pendentesCount }
        : item,
    )
    if (adminItems.length) {
      sections.push({ label: 'Administração', items: adminItems })
    }
  }
  sections.push({ label: 'Comunicação', items: [chatNav] })
  sections.push({ label: 'Sistema', items: [ATUALIZACOES_NAV] })
  return sections
}

function roleLabelFor(isSuperadmin: boolean, isAdmin: boolean): string {
  if (isSuperadmin) return 'Superadmin'
  if (isAdmin) return 'Admin Financeiro'
  return 'Usuário Financeiro'
}

export function Layout(): React.ReactElement {
  useSessionRedirect()
  // Conecta no realtime do chat (toast + invalidate de queries)
  useChatRealtime({ activeOtherUserId: null })
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const isSuperadmin = useAuthStore((s) => s.isSuperadmin)
  const logout = useAuthStore((s) => s.logout)
  const loading = useAuthStore((s) => s.loading)
  const [version, setVersion] = React.useState<string>('')
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const pendentesQ = useQuery({
    ...pendentesCountQuery,
    enabled: isAdmin && APP_MODE !== 'admin',
  })
  const pendentesCount = pendentesQ.data ?? 0

  const modulosQ = useQuery({
    ...meusModulosQuery,
    enabled: APP_MODE === 'user' && !isAdmin && !isSuperadmin,
  })

  const chatUnreadQ = useQuery(unreadTotalQuery)
  const chatUnread = chatUnreadQ.data ?? 0

  React.useEffect(() => {
    let active = true
    void window.api
      .getVersion()
      .then((v) => {
        if (active) setVersion(v)
      })
      .catch(() => {
        /* noop */
      })
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    if (APP_MODE !== 'user') return
    const unsubscribe = window.api.onMenuAction((action) => {
      if (action === 'new-lancamento') {
        navigate('/lancamentos/novo')
      }
    })
    return () => {
      unsubscribe()
    }
  }, [navigate])

  const handleLogout = React.useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  const sections = React.useMemo(
    () =>
      buildSections({
        isAdmin,
        isSuperadmin,
        pendentesCount,
        chatUnread,
        modulos: modulosQ.data,
      }),
    [isAdmin, isSuperadmin, pendentesCount, chatUnread, modulosQ.data],
  )
  const roleLabel = roleLabelFor(isSuperadmin, isAdmin)
  const sidebarMode: 'user' | 'admin' = APP_MODE === 'admin' ? 'admin' : 'user'

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-64 shrink-0 bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <SidebarContent
          appMode={sidebarMode}
          appTitle={APP_TITLE}
          sections={sections}
          version={version}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <SidebarContent
              appMode={sidebarMode}
              appTitle={APP_TITLE}
              sections={sections}
              version={version}
              onClose={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          profile={profile}
          roleLabel={roleLabel}
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
