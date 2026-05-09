import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { Lock, Unlock } from 'lucide-react'
import type { LoaderFunctionArgs } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { DataTable } from '../components/ui/data-table'
import { RowActionsMenu } from '../components/admin/RowActionsMenu'
import { FecharMesDialog } from '../components/admin/periodos/FecharMesDialog'
import { ReabrirMesDialog } from '../components/admin/periodos/ReabrirMesDialog'
import {
  fetchPeriodosFechados,
  adminKeys,
  type PeriodoFechadoWithJoins,
} from '../lib/admin-queries'
import { mapError } from '../lib/error-mapper'
import { formatPeriodo } from '../lib/format'
import { format, parseISO } from 'date-fns'

interface PeriodoListRow {
  id: string // synthetic key (the period itself)
  periodo: string // YYYY-MM-01
  status: 'ABERTO' | 'FECHADO' | 'REABERTO'
  fechamento: PeriodoFechadoWithJoins | null
}

function statusVariant(s: PeriodoListRow['status']): {
  variant: 'success' | 'secondary' | 'warning'
  label: string
} {
  switch (s) {
    case 'ABERTO':
      return { variant: 'success', label: 'Aberto' }
    case 'FECHADO':
      return { variant: 'secondary', label: 'Fechado' }
    case 'REABERTO':
      return { variant: 'warning', label: 'Reaberto' }
  }
}

function rollingMonths(count: number): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    out.push(`${y}-${m}-01`)
  }
  return out
}

function buildRows(
  periodos: string[],
  fechamentos: PeriodoFechadoWithJoins[],
): PeriodoListRow[] {
  const byPeriodo = new Map<string, PeriodoFechadoWithJoins>()
  for (const f of fechamentos) byPeriodo.set(f.periodo, f)
  return periodos.map((p) => {
    const fechamento = byPeriodo.get(p) ?? null
    let status: PeriodoListRow['status'] = 'ABERTO'
    if (fechamento) {
      status = fechamento.reaberto_em ? 'REABERTO' : 'FECHADO'
    }
    return {
      id: p,
      periodo: p,
      status,
      fechamento,
    }
  })
}

interface ColumnHandlers {
  onFechar: (row: PeriodoListRow) => void
  onReabrir: (row: PeriodoListRow) => void
}

function buildColumns(h: ColumnHandlers): ColumnDef<PeriodoListRow, unknown>[] {
  return [
    {
      accessorKey: 'periodo',
      header: 'Período',
      cell: (ctx) => formatPeriodo(ctx.getValue<string>()),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (ctx) => {
        const v = statusVariant(ctx.getValue<PeriodoListRow['status']>())
        return <Badge variant={v.variant}>{v.label}</Badge>
      },
    },
    {
      id: 'fechado_por',
      header: 'Fechado por',
      cell: (ctx) => ctx.row.original.fechamento?.fechador?.nome_completo ?? '—',
    },
    {
      id: 'fechado_em',
      header: 'Fechado em',
      cell: (ctx) => {
        const f = ctx.row.original.fechamento
        if (!f) return '—'
        return (
          <span className="tabular-nums text-xs text-muted-foreground">
            {format(parseISO(f.fechado_em), "dd/MM/yyyy 'às' HH:mm")}
          </span>
        )
      },
    },
    {
      id: 'acoes',
      header: () => <span className="sr-only">Ações</span>,
      cell: (ctx) => {
        const row = ctx.row.original
        const isFechado = row.status === 'FECHADO'
        const isReaberto = row.status === 'REABERTO'
        return (
          <RowActionsMenu
            extraActions={[
              {
                key: 'fechar',
                label: 'Fechar mês',
                icon: <Lock />,
                onSelect: () => h.onFechar(row),
                disabled: isFechado || isReaberto,
              },
              {
                key: 'reabrir',
                label: 'Reabrir',
                icon: <Unlock />,
                onSelect: () => h.onReabrir(row),
                disabled: !isFechado,
                destructive: true,
              },
            ]}
          />
        )
      },
      size: 60,
    },
  ]
}

export function AdminPeriodosPage(): React.ReactElement {
  const [fecharOpen, setFecharOpen] = React.useState(false)
  const [reabrirOpen, setReabrirOpen] = React.useState(false)
  const [active, setActive] = React.useState<PeriodoListRow | null>(null)

  const fechamentosQ = useQuery({
    queryKey: adminKeys.periodosFechados,
    queryFn: fetchPeriodosFechados,
    staleTime: 1000 * 30,
  })

  const periodos = React.useMemo(() => rollingMonths(12), [])
  const rows = React.useMemo(
    () => buildRows(periodos, fechamentosQ.data ?? []),
    [periodos, fechamentosQ.data],
  )

  const handleFechar = (row: PeriodoListRow): void => {
    setActive(row)
    setFecharOpen(true)
  }

  const handleReabrir = (row: PeriodoListRow): void => {
    setActive(row)
    setReabrirOpen(true)
  }

  const columns = React.useMemo(
    () =>
      buildColumns({
        onFechar: handleFechar,
        onReabrir: handleReabrir,
      }),
    [],
  )

  const errorMsg = fechamentosQ.error ? mapError(fechamentosQ.error).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Períodos"
        description="Fechamento e reabertura dos períodos contábeis (últimos 12 meses)."
      />

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar períodos</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable<PeriodoListRow>
            columns={columns}
            data={rows}
            isLoading={fechamentosQ.isLoading}
            emptyMessage="Nenhum período disponível."
          />
        </CardContent>
      </Card>

      <FecharMesDialog
        open={fecharOpen}
        onOpenChange={(o) => {
          setFecharOpen(o)
          if (!o) setActive(null)
        }}
        periodo={active?.periodo ?? null}
      />

      <ReabrirMesDialog
        open={reabrirOpen}
        onOpenChange={(o) => {
          setReabrirOpen(o)
          if (!o) setActive(null)
        }}
        periodo={active?.periodo ?? null}
        fechamentoId={active?.fechamento?.id ?? null}
      />
    </div>
  )
}

export default AdminPeriodosPage

export async function loader(_args: LoaderFunctionArgs): Promise<null> {
  return null
}
