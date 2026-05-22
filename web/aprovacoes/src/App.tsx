import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth, signOut } from './lib/auth-store'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorToast, attachErrorToastToQueryClient } from './components/ErrorToast'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, err: any) => {
        if (err?.status === 401 || err?.code === 'PGRST301') return false
        return count < 1
      },
    },
  },
})
// Toast global pra erros de query — torna erros invisíveis em visíveis
attachErrorToastToQueryClient(queryClient)

async function unregisterServiceWorkers(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch (e) {
    console.warn('[reset] falha ao limpar SW/cache:', e)
  }
}

function Gate(): React.ReactElement {
  const { loading, session, profile, profileError } = useAuth()
  const [tookTooLong, setTookTooLong] = React.useState(false)
  React.useEffect(() => {
    if (!loading) {
      setTookTooLong(false)
      return
    }
    const t = setTimeout(() => setTookTooLong(true), 4000)
    return () => clearTimeout(t)
  }, [loading])

  if (loading) {
    if (tookTooLong) return <StuckScreen />
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amb-400 border-r-transparent" />
      </div>
    )
  }
  if (profileError) {
    return (
      <FullMessage
        title="Falha ao carregar perfil"
        descricao={profileError}
        showResetButton
      />
    )
  }
  if (!session) return <Login />
  if (!profile?.ativo) {
    return <FullMessage title="Usuário inativo" descricao="Sua conta foi desativada. Contate o admin." />
  }
  const podeAprovar = profile.role === 'admin_financeiro' || profile.is_superadmin === true
  if (!podeAprovar) {
    return (
      <FullMessage
        title="Acesso restrito"
        descricao="Aprovações é só para admin_financeiro ou superadmin."
      />
    )
  }
  return <Dashboard />
}

function StuckScreen(): React.ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card-elevated max-w-md p-8 text-center">
        <img src="/icon-192.png" alt="Rodopav" className="mx-auto mb-3 h-12 w-12 rounded-lg" />
        <p className="label-eyebrow">Aprovações</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-50">Demorando demais</h2>
        <p className="mt-2 text-sm text-zinc-400">Algo travou ao conectar. Tente:</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-amb-400 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-amb-300"
          >
            Recarregar página
          </button>
          <button
            onClick={async () => {
              await unregisterServiceWorkers()
              window.location.reload()
            }}
            className="rounded-md border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800/40"
          >
            Limpar cache do app + recarregar
          </button>
        </div>
      </div>
    </div>
  )
}

function FullMessage({
  title,
  descricao,
  showResetButton,
}: {
  title: string
  descricao: string
  showResetButton?: boolean
}): React.ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card-elevated max-w-md p-8 text-center">
        <p className="label-eyebrow">Aprovações</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-50">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{descricao}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => void signOut()}
            className="text-xs font-semibold uppercase tracking-wider text-amb-400 hover:underline"
          >
            Sair
          </button>
          {showResetButton ? (
            <button
              onClick={async () => {
                await unregisterServiceWorkers()
                window.location.reload()
              }}
              className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
            >
              Limpar cache + recarregar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorToast />
          <Gate />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
