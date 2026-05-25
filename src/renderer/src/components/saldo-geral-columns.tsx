import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Badge } from './ui/badge'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/cn'
import type { SaldoGeralRow } from '../lib/queries'

const TRANSF_TOOLTIP =
  'Transferências entre contas próprias — não contam como entrada/saída operacional.'

const SALDO_ANTERIOR_TOOLTIP =
  'Saldo da conta no dia ANTES do início do período filtrado. Não é o "saldo inicial cadastrado" — é o resultado acumulado de TODOS os lançamentos anteriores ao filtro.'

const SALDO_FINAL_TOOLTIP =
  'Saldo da conta no FIM do período filtrado. Para ver o saldo de hoje, use o filtro até a data de hoje.'

export function buildSaldoGeralColumns(): ColumnDef<SaldoGeralRow>[] {
  return [
    {
      accessorKey: 'conta',
      header: 'Conta',
      cell: (ctx) => (
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-foreground">
            {ctx.row.original.conta ?? '—'}
          </span>
          <span className="text-xs text-muted-foreground">
            {ctx.row.original.empresa ?? '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'saldo_inicial',
      header: () => (
        <div className="text-right" title={SALDO_ANTERIOR_TOOLTIP}>
          Saldo anterior
        </div>
      ),
      cell: (ctx) => (
        <div className="text-right tabular-nums text-foreground">
          {formatBRL(ctx.getValue<number | null>() ?? 0)}
        </div>
      ),
    },
    {
      accessorKey: 'entradas',
      header: () => <div className="text-right">Entradas</div>,
      cell: (ctx) => {
        const v = ctx.getValue<number | null>() ?? 0
        return (
          <div
            className={cn(
              'text-right tabular-nums',
              v > 0 ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {formatBRL(v)}
          </div>
        )
      },
    },
    {
      accessorKey: 'saidas',
      header: () => <div className="text-right">Saídas</div>,
      cell: (ctx) => {
        const v = ctx.getValue<number | null>() ?? 0
        return (
          <div
            className={cn(
              'text-right tabular-nums',
              v > 0 ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {formatBRL(v)}
          </div>
        )
      },
    },
    {
      accessorKey: 'transferencias_recebidas',
      header: () => (
        <div className="text-right" title={TRANSF_TOOLTIP}>
          Transf. recebidas
        </div>
      ),
      cell: (ctx) => {
        const v = ctx.getValue<number | null>() ?? 0
        return (
          <div
            className={cn(
              'text-right tabular-nums',
              v > 0 ? 'text-success' : 'text-muted-foreground',
            )}
            title={TRANSF_TOOLTIP}
          >
            {formatBRL(v)}
          </div>
        )
      },
    },
    {
      accessorKey: 'transferencias_enviadas',
      header: () => (
        <div className="text-right" title={TRANSF_TOOLTIP}>
          Transf. enviadas
        </div>
      ),
      cell: (ctx) => {
        const v = ctx.getValue<number | null>() ?? 0
        return (
          <div
            className={cn(
              'text-right tabular-nums',
              v > 0 ? 'text-blu-600' : 'text-muted-foreground',
            )}
            title={TRANSF_TOOLTIP}
          >
            {formatBRL(v)}
          </div>
        )
      },
    },
    {
      accessorKey: 'saldo_atual',
      header: () => (
        <div className="text-right" title={SALDO_FINAL_TOOLTIP}>
          Saldo final
        </div>
      ),
      cell: (ctx) => (
        <div className="text-right font-semibold tabular-nums text-foreground">
          {formatBRL(ctx.getValue<number | null>() ?? 0)}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (ctx) => {
        const value = ctx.getValue<string | null>()
        if (value === 'DIVERGENTE') {
          return (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3" />
              Divergente
            </Badge>
          )
        }
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" />
            Conferido
          </Badge>
        )
      },
      size: 130,
    },
  ]
}
