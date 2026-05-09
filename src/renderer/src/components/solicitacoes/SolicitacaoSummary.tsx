import * as React from 'react'
import { formatBRL, formatDate } from '../../lib/format'
import type { AdminSolicitacaoSaldoRow } from '../../lib/solicitacoes-queries'

interface SolicitacaoSummaryProps {
  solicitacao: AdminSolicitacaoSaldoRow
}

/**
 * Bloco read-only com os dados principais de uma solicitação. Reaproveitado
 * pelos diálogos de aprovação e rejeição.
 */
export function SolicitacaoSummary({
  solicitacao,
}: SolicitacaoSummaryProps): React.ReactElement {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm">
      <p className="font-medium">{solicitacao.descricao}</p>
      <div className="mt-2 grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
        <span>
          Solicitante:{' '}
          <span className="text-foreground">
            {solicitacao.solicitante?.nome_completo ?? '—'}
          </span>
        </span>
        <span>Data: {formatDate(solicitacao.created_at)}</span>
        <span>
          Destino:{' '}
          <span className="text-foreground">
            {solicitacao.conta_destino?.apelido ?? '—'}
          </span>
        </span>
        <span>
          Valor:{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {formatBRL(solicitacao.valor)}
          </span>
        </span>
      </div>
    </div>
  )
}
