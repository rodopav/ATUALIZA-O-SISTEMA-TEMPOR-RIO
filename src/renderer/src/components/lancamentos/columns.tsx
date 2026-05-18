import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CheckCircle2,
  Coins,
  Receipt,
  CreditCard,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { formatBRL, formatDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import {
  LancamentoRowActions,
  type LancamentoActionHandlers,
} from './LancamentoRowActions'
import type { LancamentoRow } from '../../lib/lancamentos-queries'
import type { ContaLookupInfo } from '../../lib/contas-lookup-query'

export type ColumnHandlers = LancamentoActionHandlers

export interface BuildColumnsOptions {
  /**
   * Map opcional id→{apelido, is_caixa_fisico} pra resolver nome+selo
   * de conta quando o embed vier null por RLS. Carregado via
   * contasLookupQuery (view bypass-RLS apenas com label e flag).
   */
  contasLookup?: Map<string, ContaLookupInfo>
}

interface ResolvedConta {
  apelido: string
  is_caixa_fisico: boolean
}

export function buildLancamentoColumns(
  handlers: ColumnHandlers,
  opts: BuildColumnsOptions = {},
): ColumnDef<LancamentoRow, unknown>[] {
  const lookup = opts.contasLookup
  const resolveConta = (
    embedded:
      | { apelido: string; is_caixa_fisico?: boolean }
      | null
      | undefined,
    id: string | null | undefined,
  ): ResolvedConta | null => {
    if (embedded?.apelido) {
      return {
        apelido: embedded.apelido,
        is_caixa_fisico: Boolean(embedded.is_caixa_fisico),
      }
    }
    if (id && lookup) {
      const info = lookup.get(id)
      return info
        ? { apelido: info.apelido, is_caixa_fisico: info.is_caixa_fisico }
        : null
    }
    return null
  }
  // Quem ainda chama a função antiga: damos um alias estilo facade
  const resolveApelido = (
    embedded: { apelido: string } | null | undefined,
    id: string | null | undefined,
  ): string | null => resolveConta(embedded, id)?.apelido ?? null
  void resolveApelido
  return [
    {
      accessorKey: 'data',
      header: 'Data',
      cell: (ctx) => (
        <span className="tabular-nums text-foreground">
          {formatDate(ctx.getValue<string>())}
        </span>
      ),
      size: 110,
    },
    {
      accessorKey: 'ri',
      header: 'RI',
      cell: (ctx) => {
        const value = ctx.getValue<string | null>()
        if (!value) return <span className="text-muted-foreground">—</span>
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {value}
          </span>
        )
      },
      size: 90,
    },
    {
      accessorKey: 'descricao',
      header: 'Descrição',
      cell: (ctx) => {
        const row = ctx.row.original
        const origem = resolveConta(row.conta_origem, row.conta_origem_id)
        const destino = resolveConta(row.conta_destino, row.conta_destino_id)
        const envolveCaixa =
          origem?.is_caixa_fisico || destino?.is_caixa_fisico
        return (
          <div className="flex max-w-md flex-col gap-1">
            <span className="line-clamp-2 font-medium text-foreground">
              {row.descricao}
            </span>
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {row.fornecedor?.nome ? (
                <span className="truncate">{row.fornecedor.nome}</span>
              ) : null}
              {envolveCaixa ? (
                <Badge
                  variant="outline"
                  className="border-warning/40 bg-warning/10 text-[10px] text-warning"
                  title="Movimentação envolve caixa físico"
                >
                  <Coins className="h-3 w-3" />
                  Caixa físico
                </Badge>
              ) : null}
              {row.is_tarifa ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
                  title="Tarifa bancária — pode ter estourado saldo"
                >
                  <Receipt className="h-3 w-3" />
                  TARIFA
                </Badge>
              ) : null}
              {row.usou_limite ? (
                <Badge
                  variant="outline"
                  className="border-destructive/50 bg-destructive/10 text-[10px] text-destructive"
                  title="Este lançamento usou o limite (cheque especial) da conta"
                >
                  <CreditCard className="h-3 w-3" />
                  LIMITE
                </Badge>
              ) : null}
              {row.estorno_de_id ? (
                <Badge variant="warning" className="text-[10px]">
                  ESTORNO
                </Badge>
              ) : null}
              {row.motivo_estorno ? (
                <Badge variant="secondary" className="text-[10px]">
                  ESTORNADO
                </Badge>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'valor',
      header: () => <div className="text-right">Valor</div>,
      cell: (ctx) => {
        const row = ctx.row.original
        const isTransfer = row.tipo?.is_transferencia ?? false
        const colorClass = isTransfer
          ? 'text-blu-600'
          : row.natureza === 'ENTRADA'
            ? 'text-success'
            : 'text-destructive'
        const prefix = isTransfer
          ? ''
          : row.natureza === 'ENTRADA'
            ? '+ '
            : '− '
        return (
          <div
            className={cn(
              'text-right font-semibold tabular-nums',
              colorClass,
            )}
          >
            {prefix}
            {formatBRL(Number(row.valor))}
          </div>
        )
      },
      size: 140,
    },
    {
      id: 'conta',
      header: 'Conta',
      cell: (ctx) => {
        const row = ctx.row.original
        const origem = resolveApelido(row.conta_origem, row.conta_origem_id)
        const destino = resolveApelido(row.conta_destino, row.conta_destino_id)
        const isTransfer = row.tipo?.is_transferencia ?? false
        if (isTransfer && origem && destino) {
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowRightLeft className="h-3 w-3 text-blu-600" />
              <span className="text-foreground">{origem}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-foreground">{destino}</span>
            </div>
          )
        }
        if (row.natureza === 'ENTRADA' && destino) {
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowDownLeft className="h-3 w-3 text-success" />
              <span className="text-foreground">{destino}</span>
            </div>
          )
        }
        if (row.natureza === 'SAIDA' && origem) {
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpRight className="h-3 w-3 text-destructive" />
              <span className="text-foreground">{origem}</span>
            </div>
          )
        }
        return <span className="text-xs text-muted-foreground">—</span>
      },
      size: 220,
    },
    {
      id: 'centro',
      header: 'Centro',
      cell: (ctx) => (
        <span className="text-xs text-muted-foreground">
          {ctx.row.original.centro?.nome ?? '—'}
        </span>
      ),
      size: 160,
    },
    {
      id: 'responsavel',
      header: 'Responsável',
      cell: (ctx) => (
        <span className="text-xs text-muted-foreground">
          {ctx.row.original.responsavel?.nome_completo ?? '—'}
        </span>
      ),
      size: 160,
    },
    {
      id: 'conciliacao',
      header: 'Conciliação',
      cell: (ctx) => {
        const row = ctx.row.original
        if (row.conciliado_em) {
          const conciliador = row.conciliador?.nome_completo ?? '—'
          const tooltip = `Conciliado em ${formatDate(row.conciliado_em)} por ${conciliador}`
          return (
            <Badge variant="success" title={tooltip}>
              <CheckCircle2 className="h-3 w-3" />
              Conciliado
            </Badge>
          )
        }
        return (
          <Badge variant="outline" title="Aguardando conciliação">
            Pendente
          </Badge>
        )
      },
      size: 130,
    },
    {
      id: 'acoes',
      header: () => <span className="sr-only">Ações</span>,
      cell: (ctx) => (
        <LancamentoRowActions row={ctx.row.original} handlers={handlers} />
      ),
      size: 60,
    },
  ]
}
