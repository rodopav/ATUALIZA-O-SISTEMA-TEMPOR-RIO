import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { RowActionsMenu } from '../RowActionsMenu'
import { formatBRL, formatPeriodo } from '../../../lib/format'
import type { SaldoInicialWithJoins } from '../../../lib/admin-queries'

export function buildSaldoColumns(
  onEdit: (row: SaldoInicialWithJoins) => void,
  onDelete: (row: SaldoInicialWithJoins) => void,
): ColumnDef<SaldoInicialWithJoins, unknown>[] {
  return [
    {
      accessorKey: 'periodo',
      header: 'Período',
      cell: (ctx) => formatPeriodo(ctx.getValue<string>()),
    },
    {
      id: 'conta',
      header: 'Conta',
      cell: (ctx) => {
        const r = ctx.row.original
        const apelido = r.conta?.apelido ?? '—'
        const empresa = r.conta?.empresa?.razao_social ?? null
        return (
          <div className="flex flex-col">
            <span className="font-medium">{apelido}</span>
            {empresa ? (
              <span className="text-xs text-muted-foreground">{empresa}</span>
            ) : null}
          </div>
        )
      },
    },
    {
      accessorKey: 'valor',
      header: () => <div className="text-right">Valor</div>,
      cell: (ctx) => (
        <div className="text-right font-medium tabular-nums">
          {formatBRL(Number(ctx.getValue<number>()))}
        </div>
      ),
    },
    {
      id: 'criador',
      header: 'Criado por',
      cell: (ctx) => ctx.row.original.criador?.nome_completo ?? '—',
    },
    {
      id: 'acoes',
      header: () => <span className="sr-only">Ações</span>,
      cell: (ctx) => (
        <RowActionsMenu
          editLabel="Editar"
          deleteLabel="Excluir"
          onEdit={() => onEdit(ctx.row.original)}
          onDelete={() => onDelete(ctx.row.original)}
        />
      ),
      size: 60,
    },
  ]
}
