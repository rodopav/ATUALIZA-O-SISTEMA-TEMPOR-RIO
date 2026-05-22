import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { LogOut, RefreshCw } from 'lucide-react'
import { useAuth, signOut } from '../lib/auth-store'
import { alertasQuery } from '../lib/queries'
import { Button } from '../components/ui/Button'
import { HeroExecutivo } from '../components/HeroExecutivo'
import { AlertasBanner } from '../components/AlertasBanner'
import { SaldosCards } from '../components/SaldosCards'
import { KpisGrid } from '../components/KpisGrid'
import { ContasNegativasList } from '../components/ContasNegativasList'
import { LimitesPorContaList } from '../components/LimitesPorContaList'

export function Dashboard(): React.ReactElement {
  const { profile } = useAuth()
  const alertas = useQuery(alertasQuery)
  const temAlertas = (alertas.data?.length ?? 0) > 0
  const [refreshing, setRefreshing] = React.useState(false)

  const refresh = async (): Promise<void> => {
    setRefreshing(true)
    try {
      // Invalida cache do React Query — força refetch de todas as queries.
      // Simples: recarrega a página. Em prod isso é instantâneo via SW cache.
      window.location.reload()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
      {/* Top bar */}
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label-eyebrow">Magnata · Rodopav</p>
          <h1 className="truncate text-xl font-bold text-zinc-50 sm:text-2xl">
            Olá, {profile?.nome_completo?.split(' ')[0] ?? 'CFO'}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={refresh} loading={refreshing} aria-label="Atualizar">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Sair">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="space-y-5">
        {/* 1. Hero — diagnóstico em 3s */}
        <HeroExecutivo />

        {/* 2. Atenção necessária */}
        {temAlertas ? (
          <section className="space-y-2">
            <SectionHeader label="Atenção necessária" />
            <AlertasBanner alertas={alertas.data ?? []} />
          </section>
        ) : null}

        {/* 3. Caixa do grupo */}
        <section className="space-y-2">
          <SectionHeader label="Caixa do grupo" />
          <SaldosCards />
        </section>

        {/* 4. Pulso do mês */}
        <section className="space-y-2">
          <SectionHeader label="Pulso do mês" />
          <KpisGrid />
        </section>

        {/* 5. Detalhes — Contas e limites */}
        <section className="space-y-3">
          <SectionHeader label="Detalhes por banco" />
          <LimitesPorContaList />
          <ContasNegativasList />
        </section>
      </div>

      {/* PWA hint footer */}
      <footer className="mt-10 text-center text-[10px] uppercase tracking-widest text-zinc-600">
        Magnata Web · adicione à tela inicial para acesso rápido
      </footer>
    </div>
  )
}

function SectionHeader({ label }: { label: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="h-px w-6 bg-amb-400" />
      <span className="label-eyebrow">{label}</span>
    </div>
  )
}
