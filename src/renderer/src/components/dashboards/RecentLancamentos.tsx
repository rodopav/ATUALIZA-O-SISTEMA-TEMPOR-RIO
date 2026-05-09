import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react'
import { Skeleton } from '../ui/skeleton'
import { EmptyState } from '../ui/empty-state'
import { formatBRL, formatDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { LancamentoRow } from '../../lib/lancamentos-queries'

interface RecentLancamentosProps {
  data: LancamentoRow[]
  loading?: boolean
}

export function RecentLancamentos({
  data,
  loading,
}: RecentLancamentosProps): React.ReactElement {
  if (loading) {
    return (
      <ul className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-6 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-20" />
          </li>
        ))}
      </ul>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<ArrowRightLeft />}
        title="Sem lançamentos recentes"
        description="As últimas movimentações aparecerão aqui."
      />
    )
  }

  return (
    <ul className="divide-y">
      {data.map((row) => (
        <RecentItem key={row.id} row={row} />
      ))}
    </ul>
  )
}

interface RecentItemProps {
  row: LancamentoRow
}

function RecentItem({ row }: RecentItemProps): React.ReactElement {
  const isTransfer = row.tipo?.is_transferencia ?? false
  const tone = isTransfer ? 'info' : row.natureza === 'ENTRADA' ? 'success' : 'destructive'
  const Icon = isTransfer
    ? ArrowRightLeft
    : row.natureza === 'ENTRADA'
      ? ArrowDownLeft
      : ArrowUpRight
  const valueClass = isTransfer
    ? 'text-blu-600'
    : row.natureza === 'ENTRADA'
      ? 'text-success'
      : 'text-destructive'

  return (
    <li>
      <Link
        to={`/lancamentos/${row.id}`}
        className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4',
            tone === 'success' && 'bg-success/10 text-success',
            tone === 'destructive' && 'bg-destructive/10 text-destructive',
            tone === 'info' && 'bg-blu-600/10 text-blu-600',
          )}
        >
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {row.descricao}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDate(row.data)}
            {row.fornecedor?.nome ? ` · ${row.fornecedor.nome}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 text-sm font-semibold tabular-nums',
            valueClass,
          )}
        >
          {row.natureza === 'SAIDA' && !isTransfer ? '−' : ''}
          {formatBRL(Number(row.valor))}
        </span>
      </Link>
    </li>
  )
}
