import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2 } from 'lucide-react'
import { DataTable } from '../ui/data-table'
import { Button } from '../ui/button'
import { formatBRL, formatDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { PendenteConciliacaoRow } from '../../lib/conciliacao-queries'

interface PendentesTableProps {
  data: PendenteConciliacaoRow[]
  loading?: boolean
  onConciliar: (row: PendenteConciliacaoRow) => void
  /**
   * Conjunto de IDs selecionados pra ação em lote. Quando definido (≠ null),
   * a tabela renderiza a coluna de checkbox e o header com selecionar-tudo.
   */
  selectedIds?: Set<string> | null
  onToggleOne?: (id: string) => void
  onToggleAll?: (visibleIds: string[]) => void
}

export function PendentesTable({
  data,
  loading,
  onConciliar,
  selectedIds,
  onToggleOne,
  onToggleAll,
}: PendentesTableProps): React.ReactElement {
  const showSelection = !!selectedIds && !!onToggleOne && !!onToggleAll

  const visibleIds = React.useMemo(
    () => data.map((r) => r.id).filter((id): id is string => !!id),
    [data],
  )
  const allChecked =
    showSelection &&
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds!.has(id))
  const someChecked =
    showSelection &&
    visibleIds.some((id) => selectedIds!.has(id)) &&
    !allChecked

  const columns = React.useMemo<ColumnDef<PendenteConciliacaoRow>[]>(
    () => {
      const cols: ColumnDef<PendenteConciliacaoRow>[] = []

      if (showSelection) {
        cols.push({
          id: 'select',
          enableSorting: false,
          header: () => (
            <input
              type="checkbox"
              aria-label="Selecionar todos"
              className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked
              }}
              onChange={() => onToggleAll!(visibleIds)}
            />
          ),
          cell: (ctx) => {
            const id = ctx.row.original.id
            if (!id) return null
            const checked = selectedIds!.has(id)
            return (
              <input
                type="checkbox"
                aria-label="Selecionar lançamento"
                className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                checked={checked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleOne!(id)}
              />
            )
          },
          size: 44,
        })
      }

      cols.push(
        {
          accessorKey: 'data',
          header: 'Data',
          cell: (ctx) => {
            const v = ctx.getValue<string | null>()
            return (
              <span className="tabular-nums text-foreground">
                {v ? formatDate(v) : '—'}
              </span>
            )
          },
          size: 110,
        },
        {
          accessorKey: 'descricao',
          header: 'Descrição',
          cell: (ctx) => {
            const row = ctx.row.original
            return (
              <div className="flex max-w-md flex-col gap-0.5">
                <span className="line-clamp-2 font-medium text-foreground">
                  {row.descricao ?? '—'}
                </span>
              </div>
            )
          },
        },
        {
          accessorKey: 'valor',
          header: () => <div className="text-right">Valor</div>,
          cell: (ctx) => {
            const row = ctx.row.original
            const valor = Number(row.valor ?? 0)
            const isEntrada = row.natureza === 'ENTRADA'
            const colorClass = isEntrada ? 'text-success' : 'text-destructive'
            const prefix = isEntrada ? '+ ' : '− '
            return (
              <div
                className={cn(
                  'text-right font-semibold tabular-nums',
                  colorClass,
                )}
              >
                {prefix}
                {formatBRL(valor)}
              </div>
            )
          },
          size: 140,
        },
        {
          accessorKey: 'conta_apelido',
          header: 'Conta',
          cell: (ctx) => (
            <span className="text-xs text-muted-foreground">
              {ctx.row.original.conta_apelido ?? '—'}
            </span>
          ),
          size: 200,
        },
        {
          accessorKey: 'responsavel_nome',
          header: 'Responsável',
          cell: (ctx) => (
            <span className="text-xs text-muted-foreground">
              {ctx.row.original.responsavel_nome ?? '—'}
            </span>
          ),
          size: 180,
        },
        {
          id: 'acao',
          header: () => <span className="sr-only">Conciliar</span>,
          cell: (ctx) => (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onConciliar(ctx.row.original)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Conciliar
              </Button>
            </div>
          ),
          size: 130,
        },
      )
      return cols
    },
    [
      onConciliar,
      showSelection,
      selectedIds,
      onToggleOne,
      onToggleAll,
      visibleIds,
      allChecked,
      someChecked,
    ],
  )

  return (
    <DataTable<PendenteConciliacaoRow>
      columns={columns}
      data={data}
      isLoading={loading}
      emptyTitle="Tudo conciliado!"
      emptyMessage="Nenhum lançamento pendente neste período."
      emptyIcon={<CheckCircle2 />}
      virtualize={data.length > 100}
    />
  )
}
