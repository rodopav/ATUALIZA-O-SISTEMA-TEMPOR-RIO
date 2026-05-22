import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, signOut } from './lib/auth-store'
import { hasConfig, clearConfig } from './lib/config'
import { resetSupabaseClient } from './lib/supabase'
import { Login } from './pages/Login'
import { SetupConfig } from './pages/SetupConfig'
import { Layout } from './components/Layout'
import { VisaoGeral } from './pages/VisaoGeral'
import { Liquidez } from './pages/Liquidez'
import { Fluxo } from './pages/Fluxo'
import { Empresas } from './pages/Empresas'
import { CentrosCusto } from './pages/CentrosCusto'
import { Saude } from './pages/Saude'
import { Tendencias } from './pages/Tendencias'
import { Lancamentos } from './pages/Lancamentos'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err: any) => {
        // Não retry em erro auth (PostgREST 401/JWT expired) — deixa refresh natural
        if (err?.status === 401 || err?.code === 'PGRST301') return false
        return count < 1
      },
    },
  },
})

function ConfigGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const [hasIt, setHasIt] = React.useState<boolean>(hasConfig())
  if (!hasIt) return <SetupConfig onSaved={() => setHasIt(true)} />
  return <>{children}</>
}

function AuthGate(): React.ReactElement {
  const { loading, session, profile, profileError } = useAuth()
  // Timeout pra detectar loading infinito (rede ruim, SW travado, etc.).
  // Se passar de 8s carregando, mostra fallback com botão de reset.
  const [tookTooLong, setTookTooLong] = React.useState(false)
  React.useEffect(() => {
    if (!loading) {
      setTookTooLong(false)
      return
    }
    const t = setTimeout(() => setTookTooLong(true), 8000)
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
  if (!profile) {
    // session existe mas profile null e SEM erro = JWT em refresh, aguarda.
    return (
      <FullMessage
        title="Carregando perfil"
        descricao="Aguardando dados do seu usuário…"
        loading
      />
    )
  }
  if (!profile.ativo) {
    return <FullMessage title="Usuário inativo" descricao="Sua conta foi desativada. Contate o admin." />
  }
  if (!profile.is_magnata && !profile.is_superadmin) {
    return (
      <FullMessage
        title="Acesso restrito"
        descricao="Magnata é cockpit executivo. Sua conta precisa da flag is_magnata ativa."
      />
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<VisaoGeral />} />
        <Route path="/liquidez" element={<Liquidez />} />
        <Route path="/fluxo" element={<Fluxo />} />
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/centros-custo" element={<CentrosCusto />} />
        <Route path="/saude" element={<Saude />} />
        <Route path="/tendencias" element={<Tendencias />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/** Mostrado quando loading dura mais que 8s — escapatória pro user. */
function StuckScreen(): React.ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card-elevated relative max-w-md overflow-hidden p-8 text-center">
        <div className="tarja-amber" />
        <img src="/icon-192.png" alt="Rodopav" className="mx-auto mb-3 h-12 w-12 rounded-lg" />
        <p className="label-eyebrow">Magnata Rodopav</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-50">Demorando demais</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Algo travou ao conectar. Tente as opções abaixo:
        </p>
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
          <button
            onClick={() => {
              if (!confirm('Trocar conexão Supabase? Vai precisar digitar URL+chave de novo.')) return
              clearConfig()
              resetSupabaseClient()
              window.location.reload()
            }}
            className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            Trocar conexão Supabase
          </button>
        </div>
      </div>
    </div>
  )
}

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

function FullMessage({
  title,
  descricao,
  loading,
  showResetButton,
}: {
  title: string
  descricao: string
  loading?: boolean
  showResetButton?: boolean
}): React.ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card-elevated relative max-w-md overflow-hidden p-8 text-center">
        <div className="tarja-amber" />
        <img src="/icon-192.png" alt="Rodopav" className="mx-auto mb-3 h-12 w-12 rounded-lg" />
        <p className="label-eyebrow">Magnata Rodopav</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-50">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{descricao}</p>
        {loading ? (
          <div className="mx-auto mt-4 h-5 w-5 animate-spin rounded-full border-2 border-amb-400 border-r-transparent" />
        ) : (
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
        )}
      </div>
    </div>
  )
}

export function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigGate>
        <BrowserRouter>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </BrowserRouter>
      </ConfigGate>
    </QueryClientProvider>
  )
}
