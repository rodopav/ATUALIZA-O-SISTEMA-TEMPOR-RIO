import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { formatBRL, formatDate } from '../../lib/format'
import { StatusBadge } from './StatusBadge'
import type { AdminSolicitacaoSaldoRow } from '../../lib/solicitacoes-queries'

export interface AdminColumnsHandlers {
  onAprovar: (row: AdminSolicitacaoSaldoRow) => void
  onRejeitar: (row: AdminSolicitacaoSaldoRow) => void
}

export function buildAdminColumns(
  handlers: AdminColumnsHandlers,
): ColumnDef<AdminSolicitacaoSaldoRow, unknown>[] {
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
      id: 'solicitante',
      header: 'Solicitante',
      cell: (ctx) => (
        <span className="text-sm text-foreground">
          {ctx.row.original.solicitante?.nome_completo ?? '—'}
        </span>
      ),
      size: 180,
    },
    {
      accessorKey: 'valor',
      header: () => <div className="text-right">Valor</div>,
      cell: (ctx) => (
        <div className="text-right text-base font-semibold tabular-nums text-foreground">
          {formatBRL(Number(ctx.getValue<number>()))}
        </div>
      ),
      size: 140,
    },
    {
      id: 'destino',
      header: 'Conta destino',
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
      id: 'origem_sugerida',
      header: 'Origem sugerida',
      cell: (ctx) => {
        const apelido = ctx.row.original.origem_sugerida?.apelido
        if (!apelido) return <span className="text-xs text-muted-foreground">—</span>
        return <span className="text-sm text-foreground">{apelido}</span>
      },
      size: 160,
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
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="success"
              size="sm"
              onClick={() => handlers.onAprovar(row)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprovar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => handlers.onRejeitar(row)}
            >
              <XCircle className="h-3.5 w-3.5" />
              Rejeitar
            </Button>
          </div>
        )
      },
      size: 220,
    },
  ]
}
