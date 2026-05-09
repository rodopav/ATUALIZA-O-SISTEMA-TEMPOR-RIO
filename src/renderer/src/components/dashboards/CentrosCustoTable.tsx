import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../ui/data-table'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { CentroCustoDashboardRow } from '../../lib/dashboards-queries'

interface CentrosCustoTableProps {
  data: CentroCustoDashboardRow[]
  loading?: boolean
}

export function CentrosCustoTable({
  data,
  loading,
}: CentrosCustoTableProps): React.ReactElement {
  const columns = React.useMemo<ColumnDef<CentroCustoDashboardRow>[]>(
    () => [
      {
        id: 'centro_custo',
        header: 'Centro de Custo',
        accessorFn: (row) =>
          row.codigo && row.centro_custo
            ? `${row.codigo} — ${row.centro_custo}`
            : (row.centro_custo ?? '—'),
        cell: (ctx) => {
          const row = ctx.row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium">{row.centro_custo ?? '—'}</span>
              {row.codigo ? (
                <span className="text-xs text-muted-foreground">
                  {row.codigo}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'qtd_lancamentos',
        header: () => <div className="text-right">Qtd Lançamentos</div>,
        cell: (ctx) => (
          <div className="text-right tabular-nums">
            {ctx.getValue<number | null>() ?? 0}
          </div>
        ),
        size: 140,
      },
      {
        accessorKey: 'entradas',
        header: () => <div className="text-right">Entradas</div>,
        cell: (ctx) => (
          <div className="text-right tabular-nums text-success">
            {formatBRL(ctx.getValue<number | null>() ?? 0)}
          </div>
        ),
        size: 160,
      },
      {
        accessorKey: 'saidas',
        header: () => <div className="text-right">Saídas</div>,
        cell: (ctx) => (
          <div className="text-right tabular-nums text-destructive">
            {formatBRL(ctx.getValue<number | null>() ?? 0)}
          </div>
        ),
        size: 160,
      },
      {
        accessorKey: 'saldo_liquido',
        header: () => <div className="text-right">Saldo Líquido</div>,
        cell: (ctx) => {
          const value = ctx.getValue<number | null>() ?? 0
          return (
            <div
              className={cn(
                'text-right font-semibold tabular-nums',
                value < 0 && 'text-destructive',
              )}
            >
              {formatBRL(value)}
            </div>
          )
        },
        size: 160,
      },
    ],
    [],
  )

  return (
    <DataTable<CentroCustoDashboardRow>
      columns={columns}
      data={data}
      isLoading={loading}
      emptyMessage="Nenhum lançamento neste período."
      hidePagination
    />
  )
}
