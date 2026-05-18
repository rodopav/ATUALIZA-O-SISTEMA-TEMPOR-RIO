import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { limitesPorContaQuery } from '../../lib/dashboards-queries'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'

/**
 * Seção do dashboard com UMA LINHA por conta que tem cheque especial.
 * Mostra o trio "saldo / limite disponível / total que pode gastar" pra
 * cada banco — exatamente como o app dos bancos reais mostra.
 *
 * Renderiza nada se não há contas com limite (não polui dashboards
 * de quem não usa cheque especial).
 */
export function LimitesPorContaSection(): React.ReactElement | null {
  const q = useQuery(limitesPorContaQuery)
  const linhas = q.data ?? []

  if (q.isLoading) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Carregando contas com limite…
        </CardContent>
      </Card>
    )
  }

  if (linhas.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-amb-400" />
            Contas com cheque especial
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Saldo real · Limite disponível · Total que dá pra gastar — uma
            visão por banco igual ao app deles.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {linhas.map((l) => {
          const noNegativo = l.saldo_atual < 0
          const consumido = noNegativo ? Math.abs(l.saldo_atual) : 0
          const consumidoPct =
            l.valor_limite > 0
              ? Math.min(100, (consumido / l.valor_limite) * 100)
              : 0

          return (
            <div
              key={l.conta_id}
              className={cn(
                'overflow-hidden rounded-lg border bg-card transition-colors',
                noNegativo ? 'border-destructive/40' : 'border-border',
              )}
            >
              {/* Cabeçalho da conta */}
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {l.apelido}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {l.banco ?? '—'}
                    {l.empresa ? ` · ${l.empresa}` : ''}
                  </p>
                </div>
                {noNegativo ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    No limite
                  </span>
                ) : null}
              </div>

              {/* Trio de valores */}
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-muted/30">
                <SaldoTile
                  label="Saldo da conta"
                  value={formatBRL(l.saldo_atual)}
                  emphasize={noNegativo}
                  valueClass={
                    noNegativo
                      ? 'text-destructive'
                      : l.saldo_atual > 0
                        ? 'text-success'
                        : 'text-foreground'
                  }
                />
                <SaldoTile
                  label="Limite disponível"
                  value={formatBRL(l.limite_disponivel)}
                  valueClass={
                    l.limite_disponivel === 0
                      ? 'text-destructive'
                      : 'text-foreground'
                  }
                />
                <SaldoTile
                  label="Total disponível"
                  value={formatBRL(l.total_disponivel)}
                  emphasize
                  valueClass="text-amb-500 dark:text-amb-400"
                />
              </div>

              {/* Barra de consumo do limite — só quando no negativo */}
              {noNegativo ? (
                <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Limite consumido</span>
                    <span className="font-mono font-semibold text-destructive">
                      {consumidoPct.toFixed(1)}% · {formatBRL(consumido)} de{' '}
                      {formatBRL(l.valor_limite)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive transition-all"
                      style={{ width: `${consumidoPct}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function SaldoTile({
  label,
  value,
  valueClass,
  emphasize,
}: {
  label: string
  value: string
  valueClass?: string
  emphasize?: boolean
}): React.ReactElement {
  return (
    <div className="px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 font-mono font-extrabold tabular-nums tracking-tight',
          emphasize ? 'text-lg' : 'text-base',
          valueClass,
        )}
      >
        {value}
      </p>
    </div>
  )
}
