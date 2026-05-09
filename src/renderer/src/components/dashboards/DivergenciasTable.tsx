import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../ui/data-table'
import { formatBRL } from '../../lib/format'
import type { SaldoGeralRow } from '../../lib/dashboards-queries'

interface DivergenciasTableProps {
  data: SaldoGeralRow[]
  loading?: boolean
}

interface DivergenciaRow extends SaldoGeralRow {
  diferenca: number
}

function calcDiferenca(r: SaldoGeralRow): number {
  const inicial = r.saldo_inicial ?? 0
  const entradas = r.entradas ?? 0
  const saidas = r.saidas ?? 0
  const atual = r.saldo_atual ?? 0
  return atual - (inicial + entradas - saidas)
}

export function DivergenciasTable({
  data,
  loading,
}: DivergenciasTableProps): React.ReactElement {
  const enriched = React.useMemo<DivergenciaRow[]>(
    () => data.map((r) => ({ ...r, diferenca: calcDiferenca(r) })),
    [data],
  )

  const columns = React.useMemo<ColumnDef<DivergenciaRow>[]>(
    () => [
      {
        accessorKey: 'conta',
        header: 'Conta',
        cell: (ctx) => {
          const row = ctx.row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium">{row.conta ?? '—'}</span>
              {row.empresa ? (
                <span className="text-xs text-muted-foreground">
                  {row.empresa}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'saldo_inicial',
        header: () => <div className="text-right">Saldo Inicial</div>,
        cell: (ctx) => (
          <div className="text-right tabular-nums">
            {formatBRL(ctx.getValue<number | null>() ?? 0)}
          </div>
        ),
      },
      {
        accessorKey: 'entradas',
        header: () => <div className="text-right">Entradas</div>,
        cell: (ctx) => (
          <div className="text-right tabular-nums text-success">
            {formatBRL(ctx.getValue<number | null>() ?? 0)}
          </div>
        ),
      },
      {
        accessorKey: 'saidas',
        header: () => <div className="text-right">Saídas</div>,
        cell: (ctx) => (
          <div className="text-right tabular-nums text-destructive">
            {formatBRL(ctx.getValue<number | null>() ?? 0)}
          </div>
        ),
      },
      {
        accessorKey: 'saldo_atual',
        header: () => <div className="text-right">Saldo Atual</div>,
        cell: (ctx) => (
          <div className="text-right font-semibold tabular-nums">
            {formatBRL(ctx.getValue<number | null>() ?? 0)}
          </div>
        ),
      },
      {
        accessorKey: 'diferenca',
        header: () => <div className="text-right">Diferença</div>,
        cell: (ctx) => (
          <div className="text-right font-semibold tabular-nums text-destructive">
            {formatBRL(ctx.getValue<number>())}
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <DataTable<DivergenciaRow>
      columns={columns}
      data={enriched}
      isLoading={loading}
      emptyMessage="Nenhuma conta divergente no período."
      hidePagination
    />
  )
}
