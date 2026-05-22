import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { LogOut, Inbox, AlertTriangle, History, CheckCheck } from 'lucide-react'
import { useAuth, signOut } from '../lib/auth-store'
import {
  solicitacoesPendentesQuery,
  solicitacoesAusenciaQuery,
  solicitacoesHistoricoQuery,
  type Solicitacao,
} from '../lib/solicitacoes-queries'
import { Button } from '../components/ui/Button'
import { SolicitacaoCard } from '../components/SolicitacaoCard'
import { AprovarDialog } from '../components/AprovarDialog'
import { RejeitarDialog } from '../components/RejeitarDialog'
import { RevisarAusenciaDialog } from '../components/RevisarAusenciaDialog'
import { PushBanner, PushStatus } from '../components/PushBanner'
import { cn } from '../lib/cn'

type Tab = 'pendentes' | 'ausencia' | 'historico'

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: 'pendentes', label: 'Pendentes', icon: <Inbox className="h-3.5 w-3.5" /> },
  { key: 'ausencia', label: 'Em ausência', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { key: 'historico', label: 'Histórico', icon: <History className="h-3.5 w-3.5" /> },
]

export function Dashboard(): React.ReactElement {
  const { profile } = useAuth()
  const [tab, setTab] = React.useState<Tab>('pendentes')

  const pendQ = useQuery(solicitacoesPendentesQuery)
  const ausenciaQ = useQuery(solicitacoesAusenciaQuery)
  const histQ = useQuery(solicitacoesHistoricoQuery)

  const [aprovarTarget, setAprovarTarget] = React.useState<Solicitacao | null>(null)
  const [rejeitarTarget, setRejeitarTarget] = React.useState<Solicitacao | null>(null)
  const [revisarTarget, setRevisarTarget] = React.useState<Solicitacao | null>(null)

  const counts = {
    pendentes: pendQ.data?.length ?? 0,
    ausencia: ausenciaQ.data?.length ?? 0,
    historico: histQ.data?.length ?? 0,
  }

  return (
    <div
      className="mx-auto max-w-3xl px-4 pb-12 sm:px-6"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Container raiz já paga o safe-area-inset-top — header só precisa de margem normal */}
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="label-eyebrow">Aprovações · Rodopav</p>
            <PushStatus />
          </div>
          <h1 className="truncate text-lg font-bold text-zinc-50 sm:text-xl">
            Oi, {profile?.nome_completo?.split(' ')[0] ?? 'responsável'}
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Sair">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>

      {/* Push banner */}
      <PushBanner />

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors',
              tab === t.key
                ? 'bg-amb-400 text-zinc-950'
                : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200',
            )}
          >
            {t.icon}
            <span>{t.label}</span>
            {counts[t.key] > 0 ? (
              <span
                className={cn(
                  'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
                  tab === t.key ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-700 text-zinc-200',
                )}
              >
                {counts[t.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="mt-4 space-y-3">
        {tab === 'pendentes' && (
          <ListaSection
            loading={pendQ.isLoading}
            items={pendQ.data ?? []}
            emptyIcon={<CheckCheck className="h-8 w-8 text-emerald-500/60" />}
            emptyTitle="Nada pra aprovar"
            emptyMsg="Quando alguém pedir saldo, aparece aqui."
            render={(s) => (
              <SolicitacaoCard
                key={s.id}
                solic={s}
                onApprove={() => setAprovarTarget(s)}
                onReject={() => setRejeitarTarget(s)}
              />
            )}
          />
        )}

        {tab === 'ausencia' && (
          <ListaSection
            loading={ausenciaQ.isLoading}
            items={ausenciaQ.data ?? []}
            emptyIcon={<CheckCheck className="h-8 w-8 text-emerald-500/60" />}
            emptyTitle="Nada pra revisar"
            emptyMsg="Liberações em ausência aguardando sua revisão aparecem aqui."
            render={(s) => (
              <SolicitacaoCard key={s.id} solic={s} onReview={() => setRevisarTarget(s)} />
            )}
          />
        )}

        {tab === 'historico' && (
          <ListaSection
            loading={histQ.isLoading}
            items={histQ.data ?? []}
            emptyIcon={<History className="h-8 w-8 text-zinc-600" />}
            emptyTitle="Sem histórico ainda"
            emptyMsg="Solicitações aprovadas ou rejeitadas aparecem aqui."
            render={(s) => <SolicitacaoCard key={s.id} solic={s} />}
          />
        )}
      </div>

      {/* Modais */}
      <AprovarDialog
        solic={aprovarTarget}
        open={!!aprovarTarget}
        onOpenChange={(o) => !o && setAprovarTarget(null)}
      />
      <RejeitarDialog
        solic={rejeitarTarget}
        open={!!rejeitarTarget}
        onOpenChange={(o) => !o && setRejeitarTarget(null)}
      />
      <RevisarAusenciaDialog
        solic={revisarTarget}
        open={!!revisarTarget}
        onOpenChange={(o) => !o && setRevisarTarget(null)}
      />
    </div>
  )
}

interface ListaSectionProps {
  loading: boolean
  items: Solicitacao[]
  emptyIcon: React.ReactNode
  emptyTitle: string
  emptyMsg: string
  render: (s: Solicitacao) => React.ReactNode
}

function ListaSection({
  loading,
  items,
  emptyIcon,
  emptyTitle,
  emptyMsg,
  render,
}: ListaSectionProps): React.ReactElement {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-zinc-800/40" />
        ))}
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 py-10 text-center">
        {emptyIcon}
        <p className="text-sm font-semibold text-zinc-200">{emptyTitle}</p>
        <p className="text-xs text-zinc-500">{emptyMsg}</p>
      </div>
    )
  }
  return <>{items.map(render)}</>
}
