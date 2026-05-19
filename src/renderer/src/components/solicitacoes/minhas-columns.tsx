import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Ban, Pencil, Send, ShieldAlert } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { formatBRL, formatDate } from '../../lib/format'
import { StatusBadge } from './StatusBadge'
import type { SolicitacaoSaldoRow } from '../../lib/solicitacoes-queries'

export interface MinhasColumnsHandlers {
  onCancelar: (row: SolicitacaoSaldoRow) => void
  onEditar: (row: SolicitacaoSaldoRow) => void
  onLiberarAusencia: (row: SolicitacaoSaldoRow) => void
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
      cell: (ctx) => {
        const row = ctx.row.original
        return (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={row.status} />
            {row.aprovada_em_ausencia ? (
              <Badge
                variant="outline"
                className="border-amb-400/50 bg-amb-400/10 text-[9px] uppercase tracking-wider text-amb-600 dark:text-amb-400"
                title="Liberada por você na ausência — aguarda revisão do admin"
              >
                <ShieldAlert className="h-3 w-3" />
                Aguarda revisão
              </Badge>
            ) : null}
          </div>
        )
      },
      size: 160,
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
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handlers.onEditar(row)}
              disabled={cancelando}
              title="Editar (só enquanto pendente)"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden md:inline">Editar</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handlers.onLiberarAusencia(row)}
              disabled={cancelando}
              title="Liberar sem admin (só pra emergência — fica rastreado)"
              className="text-amb-600 hover:text-amb-700 dark:text-amb-400 dark:hover:text-amb-300"
            >
              <Send className="h-4 w-4" />
              <span className="hidden md:inline">Liberar na ausência</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handlers.onCancelar(row)}
              disabled={cancelando}
            >
              {cancelando ? <Spinner /> : <Ban className="h-4 w-4" />}
              <span className="hidden md:inline">Cancelar</span>
            </Button>
          </div>
        )
      },
      size: 220,
    },
  ]
}
