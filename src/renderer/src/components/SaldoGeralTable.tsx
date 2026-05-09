import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  CalendarSearch,
} from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import { EmptyState } from './ui/empty-state'
import { buildSaldoGeralColumns } from './saldo-geral-columns'
import type { SaldoGeralRow } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/cn'

interface SaldoGeralTableProps {
  data: SaldoGeralRow[]
  loading?: boolean
}

const DIVERGENT_TOOLTIP = 'Total de movimentos não bate com saldo atual.'

export function SaldoGeralTable({
  data,
  loading,
}: SaldoGeralTableProps): React.ReactElement {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const columns = React.useMemo(() => buildSaldoGeralColumns(), [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const totals = React.useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc.saldoInicial += row.saldo_inicial ?? 0
        acc.entradas += row.entradas ?? 0
        acc.saidas += row.saidas ?? 0
        acc.transfRecebidas += row.transferencias_recebidas ?? 0
        acc.transfEnviadas += row.transferencias_enviadas ?? 0
        acc.saldoAtual += row.saldo_atual ?? 0
        return acc
      },
      {
        saldoInicial: 0,
        entradas: 0,
        saidas: 0,
        transfRecebidas: 0,
        transfEnviadas: 0,
        saldoAtual: 0,
      },
    )
  }, [data])

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<CalendarSearch />}
        title="Nenhuma movimentação no período."
        description="Ajuste os filtros ou registre lançamentos para visualizar os saldos."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-muted/60 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  scope="col"
                  className="border-b px-4 py-3 text-left font-medium first:pl-6 last:pr-6"
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowDownUp className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const isDivergent = row.original.status === 'DIVERGENTE'
            return (
              <tr
                key={row.id}
                title={isDivergent ? DIVERGENT_TOOLTIP : undefined}
                className={cn(
                  'transition-colors hover:bg-muted/40',
                  isDivergent &&
                    'bg-destructive/[0.04] hover:bg-destructive/[0.08]',
                )}
              >
                {row.getVisibleCells().map((cell, idx) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'border-b px-4 py-3.5 align-middle first:pl-6 last:pr-6',
                      idx === 0 &&
                        isDivergent &&
                        'border-l-2 border-l-destructive',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
        <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur">
          <tr className="border-t-2 border-foreground/10">
            <td className="px-4 py-4 pl-6 font-semibold text-foreground">
              Totais
            </td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums">
              {formatBRL(totals.saldoInicial)}
            </td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums text-success">
              {formatBRL(totals.entradas)}
            </td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums text-destructive">
              {formatBRL(totals.saidas)}
            </td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums text-success">
              {formatBRL(totals.transfRecebidas)}
            </td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums text-blu-600">
              {formatBRL(totals.transfEnviadas)}
            </td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums text-foreground">
              {formatBRL(totals.saldoAtual)}
            </td>
            <td className="px-4 py-4 pr-6" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
