import * as React from 'react'
import { ArrowUpCircle, ArrowDownCircle, Wallet, ListChecks } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatBRL } from '../../lib/format'
import type { LancamentoRow } from '../../lib/lancamentos-queries'

interface SaldoStickyBarProps {
  rows: LancamentoRow[]
  /** Texto curto do filtro ativo (ex.: "Maio/2026" ou "01/05 a 14/05"). */
  periodoLabel?: string
}

/**
 * Faixa sticky no topo da página de Lançamentos com o resumo dos lançamentos
 * exibidos (não-estornados): entradas, saídas, líquido e quantidade.
 *
 * "Acompanha o scroll" via `sticky top-0` — fica grudada abaixo do Topbar
 * (que tem z-30; usamos z-20 aqui pra não cobrir o Topbar/TabBar).
 *
 * Transferências internas entram tanto como entrada (no destino) quanto
 * saída (na origem), então o líquido fica em zero pra transferências —
 * o que é correto na visão geral.
 */
export function SaldoStickyBar({
  rows,
  periodoLabel,
}: SaldoStickyBarProps): React.ReactElement | null {
  const totals = React.useMemo(() => {
    let entradas = 0
    let saidas = 0
    let qtd = 0
    for (const r of rows) {
      // Ignora estornos do somatório pra não duplicar contagem
      if (r.estorno_de_id) continue
      qtd += 1
      if (r.natureza === 'ENTRADA') entradas += Number(r.valor) || 0
      else saidas += Number(r.valor) || 0
    }
    return { entradas, saidas, liquido: entradas - saidas, qtd }
  }, [rows])

  if (rows.length === 0) return null

  const liquidoNeg = totals.liquido < 0

  return (
    <div
      className={cn(
        'sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur md:-mx-8 md:px-8',
        'supports-[backdrop-filter]:bg-background/80',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" />
          Saldo
          {periodoLabel ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono normal-case tracking-normal text-[10px]">
              {periodoLabel}
            </span>
          ) : null}
        </div>

        <Tile
          icon={<ArrowUpCircle className="h-4 w-4 text-success" />}
          label="Entradas"
          value={formatBRL(totals.entradas)}
        />
        <Tile
          icon={<ArrowDownCircle className="h-4 w-4 text-destructive" />}
          label="Saídas"
          value={formatBRL(totals.saidas)}
        />
        <Tile
          icon={
            <Wallet
              className={cn(
                'h-4 w-4',
                liquidoNeg ? 'text-destructive' : 'text-primary',
              )}
            />
          }
          label="Líquido"
          value={formatBRL(totals.liquido)}
          valueClassName={cn(
            'font-semibold',
            liquidoNeg ? 'text-destructive' : 'text-foreground',
          )}
        />
        <Tile
          icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
          label="Qtd"
          value={String(totals.qtd)}
        />
      </div>
    </div>
  )
}

function Tile({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClassName?: string
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={cn('font-mono text-sm font-semibold tabular-nums', valueClassName)}>{value}</p>
      </div>
    </div>
  )
}
