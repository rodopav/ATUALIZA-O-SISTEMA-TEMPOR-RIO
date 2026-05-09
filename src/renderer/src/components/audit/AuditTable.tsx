import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import { Button } from '../ui/button'
import { DataTable } from '../ui/data-table'
import { AcaoBadge } from './AcaoBadge'
import type { AuditLogRow } from '../../lib/dashboards-queries'

interface AuditTableProps {
  data: AuditLogRow[]
  loading?: boolean
  onViewDiff: (row: AuditLogRow) => void
}

function fmtTs(ts: string): string {
  try {
    return format(parseISO(ts), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
  } catch {
    return ts
  }
}

export function AuditTable({
  data,
  loading,
  onViewDiff,
}: AuditTableProps): React.ReactElement {
  const columns = React.useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        accessorKey: 'ts',
        header: 'Quando',
        cell: (ctx) => (
          <span className="font-mono text-xs">
            {fmtTs(ctx.getValue<string>())}
          </span>
        ),
        size: 170,
      },
      {
        id: 'usuario',
        header: 'Usuário',
        cell: (ctx) => {
          const row = ctx.row.original
          if (!row.usuario) {
            return (
              <span className="text-xs text-muted-foreground">
                {row.usuario_id.slice(0, 8)}
              </span>
            )
          }
          return (
            <div className="flex flex-col">
              <span className="font-medium">{row.usuario.nome_completo}</span>
              <span className="text-xs text-muted-foreground">
                {row.usuario.email}
              </span>
            </div>
          )
        },
        size: 200,
      },
      {
        accessorKey: 'entidade',
        header: 'Entidade',
        cell: (ctx) => (
          <span className="text-sm">{ctx.getValue<string>()}</span>
        ),
        size: 160,
      },
      {
        accessorKey: 'acao',
        header: 'Ação',
        cell: (ctx) => <AcaoBadge acao={ctx.row.original.acao} />,
        size: 110,
      },
      {
        accessorKey: 'motivo',
        header: 'Motivo',
        cell: (ctx) => {
          const motivo = ctx.getValue<string | null>()
          if (!motivo) return <span className="text-muted-foreground">—</span>
          return (
            <span
              className="block max-w-[28rem] truncate text-sm"
              title={motivo}
            >
              {motivo}
            </span>
          )
        },
      },
      {
        id: 'acoes',
        header: () => <span className="sr-only">Ações</span>,
        cell: (ctx) => (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onViewDiff(ctx.row.original)}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver Diff
            </Button>
          </div>
        ),
        size: 130,
      },
    ],
    [onViewDiff],
  )

  return (
    <DataTable<AuditLogRow>
      columns={columns}
      data={data}
      isLoading={loading}
      emptyMessage="Nenhum evento de auditoria nos filtros selecionados."
      hidePagination
    />
  )
}
