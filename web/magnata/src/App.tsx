import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './lib/auth-store'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
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
    return (
      <FullMessage title="Usuário inativo" descricao="Sua conta foi desativada. Contate o admin." />
    )
  }
  if (!profile?.is_magnata && !profile?.is_superadmin) {
    return (
      <FullMessage
        title="Acesso restrito"
        descricao="O Magnata é cockpit executivo. Sua conta precisa da flag is_magnata ativa."
      />
    )
  }
  return <Dashboard />
}

function FullMessage({ title, descricao }: { title: string; descricao: string }): React.ReactElement {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="card-elevated max-w-md p-8 text-center">
        <p className="label-eyebrow">Magnata</p>
        <h2 className="mt-2 text-lg font-bold text-zinc-50">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{descricao}</p>
        <a
          href="/"
          onClick={async (e) => {
            e.preventDefault()
            const { signOut } = await import('./lib/auth-store')
            await signOut()
          }}
          className="mt-5 inline-block text-xs font-semibold uppercase tracking-wider text-amb-400 hover:underline"
        >
          Sair
        </a>
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
