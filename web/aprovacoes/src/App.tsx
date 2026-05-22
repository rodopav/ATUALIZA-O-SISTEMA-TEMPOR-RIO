import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth, signOut } from './lib/auth-store'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

function Gate(): React.ReactElement {
  const { loading, session, profile } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amb-400 border-r-transparent" />
      </div>
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

function FullMessage({ title, descricao }: { title: string; descricao: string }): React.ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card-elevated max-w-md p-8 text-center">
        <p className="label-eyebrow">Aprovações</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-50">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{descricao}</p>
        <button
          onClick={() => void signOut()}
          className="mt-5 text-xs font-semibold uppercase tracking-wider text-amb-400 hover:underline"
        >
          Sair
        </button>
      </div>
    </div>
  )
}

export function App(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </QueryClientProvider>
  )
}
