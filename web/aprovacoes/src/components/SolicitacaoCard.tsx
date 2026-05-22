import * as React from 'react'
import { User, ArrowRight, Clock, AlertTriangle, Check, X } from 'lucide-react'
import type { Solicitacao } from '../lib/solicitacoes-queries'
import { formatBRL, formatRelative } from '../lib/format'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

interface SolicitacaoCardProps {
  solic: Solicitacao
  onApprove?: () => void
  onReject?: () => void
  onReview?: () => void
}

export function SolicitacaoCard({
  solic,
  onApprove,
  onReject,
  onReview,
}: SolicitacaoCardProps): React.ReactElement {
  const isAusencia = solic.aprovada_em_ausencia && solic.status === 'APROVADA'
  const isPendente = solic.status === 'PENDENTE'
  const isRejeitada = solic.status === 'REJEITADA'
  const isAprovada = solic.status === 'APROVADA' && !solic.aprovada_em_ausencia

  return (
    <div
      className={cn(
        'card relative overflow-hidden p-4 sm:p-5',
        isAusencia && 'border-red-500/30 bg-red-500/[0.03]',
      )}
    >
      {isAusencia ? (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-red-500" />
      ) : isPendente ? (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-amb-400" />
      ) : isAprovada ? (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-emerald-500" />
      ) : (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-zinc-600" />
      )}

      {isAusencia ? (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-red-300">
            Liberada em sua ausência · revise agora
          </p>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500">
            <User className="mr-1 inline h-3 w-3" />
            <span className="font-semibold text-zinc-300">
              {solic.solicitante?.nome_completo ?? 'Solicitante'}
            </span>
            <span className="mx-1.5">·</span>
            <Clock className="mr-1 inline h-3 w-3" />
            {isAusencia && solic.liberada_em_ausencia_em
              ? `liberada ${formatRelative(solic.liberada_em_ausencia_em)}`
              : `criada ${formatRelative(solic.created_at)}`}
          </p>
          <p className="mt-1.5 text-sm text-zinc-100">{solic.descricao || '(sem descrição)'}</p>
        </div>
        <p className="num-mono shrink-0 text-base font-extrabold text-zinc-50 sm:text-lg">
          {formatBRL(solic.valor)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
        {solic.conta_origem_sugerida ? (
          <>
            <span className="rounded bg-zinc-800/60 px-1.5 py-0.5">
              {solic.conta_origem_sugerida.apelido}
            </span>
            <ArrowRight className="h-3 w-3 text-zinc-600" />
          </>
        ) : (
          <span className="text-zinc-600 italic">sem origem sugerida</span>
        )}
        <span className="rounded bg-zinc-800/60 px-1.5 py-0.5">
          {solic.conta_destino?.apelido ?? '—'}
        </span>
      </div>

      {isRejeitada && solic.motivo_rejeicao ? (
        <p className="mt-2 text-[11px] italic text-red-300">
          Motivo: {solic.motivo_rejeicao}
        </p>
      ) : null}

      {/* Ações */}
      {(onApprove || onReject || onReview) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onReview ? (
            <Button variant="destructive" size="sm" onClick={onReview} className="flex-1 sm:flex-none">
              <AlertTriangle className="h-3.5 w-3.5" />
              Revisar
            </Button>
          ) : (
            <>
              {onApprove ? (
                <Button variant="primary" size="sm" onClick={onApprove} className="flex-1 sm:flex-none">
                  <Check className="h-3.5 w-3.5" />
                  Aprovar
                </Button>
              ) : null}
              {onReject ? (
                <Button variant="outline" size="sm" onClick={onReject} className="flex-1 sm:flex-none">
                  <X className="h-3.5 w-3.5" />
                  Rejeitar
                </Button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}
