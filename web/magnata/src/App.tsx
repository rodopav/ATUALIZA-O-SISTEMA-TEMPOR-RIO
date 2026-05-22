import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, signOut } from './lib/auth-store'
import { hasConfig } from './lib/config'
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
        // Não retry em erro auth (PostgREST 401/JWT expired) — vai pra refresh natural
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
  const { loading, session, profile } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amb-400 border-r-transparent" />
      </div>
    )
  }
  if (!session) return <Login />
  if (!profile) {
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

function FullMessage({
  title,
  descricao,
  loading,
}: {
  title: string
  descricao: string
  loading?: boolean
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
          <button
            onClick={() => void signOut()}
            className="mt-5 text-xs font-semibold uppercase tracking-wider text-amb-400 hover:underline"
          >
            Sair
          </button>
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
