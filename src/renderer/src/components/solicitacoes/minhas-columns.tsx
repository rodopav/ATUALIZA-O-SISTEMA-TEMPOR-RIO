import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban } from 'lucide-react'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { formatBRL, formatDate } from '../../lib/format'
import { StatusBadge } from './StatusBadge'
import type { SolicitacaoSaldoRow } from '../../lib/solicitacoes-queries'

export interface MinhasColumnsHandlers {
  onCancelar: (row: SolicitacaoSaldoRow) => void
  cancelandoId: string | null
}

export function buildMinhasColumns(
  handlers: MinhasColumnsHandlers,
): ColumnDef<SolicitacaoSaldoRow, unknown>[] {
  return [
    {
      accessorKey: 'created_at',
      header: 'Data',
      cell: (ctx) => (
        <span className="tabular-nums text-foreground">
          {formatDate(ctx.getValue<string>())}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: 'valor',
      header: () => <div className="text-right">Valor</div>,
      cell: (ctx) => (
        <div className="text-right font-semibold tabular-nums text-foreground">
          {formatBRL(Number(ctx.getValue<number>()))}
        </div>
      ),
      size: 130,
    },
    {
      id: 'destino',
      header: 'Destino',
      cell: (ctx) => (
        <span className="text-sm text-foreground">
          {ctx.row.original.conta_destino?.apelido ?? '—'}
        </span>
      ),
      size: 180,
    },
    {
      accessorKey: 'descricao',
      header: 'Descrição',
      cell: (ctx) => (
        <p className="line-clamp-2 max-w-md text-sm text-foreground">
          {ctx.getValue<string>()}
        </p>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (ctx) => <StatusBadge status={ctx.row.original.status} />,
      size: 130,
    },
    {
      id: 'acoes',
      header: () => <span className="sr-only">Ações</span>,
      cell: (ctx) => {
        const row = ctx.row.original
        if (row.status !== 'PENDENTE') {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        const cancelando = handlers.cancelandoId === row.id
        return (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlers.onCancelar(row)}
            disabled={cancelando}
          >
            {cancelando ? <Spinner /> : <Ban className="h-4 w-4" />}
            Cancelar
          </Button>
        )
      },
      size: 120,
    },
  ]
}
