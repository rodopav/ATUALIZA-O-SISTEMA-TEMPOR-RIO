import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { kpisExecutivosQuery, alertasQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/cn'

/**
 * Hero — diagnóstico em 3 segundos.
 * Bolinha pulsante (verde/âmbar/vermelho) + saldo gigante + frase contextual.
 */
export function HeroExecutivo(): React.ReactElement {
  const k = useQuery(kpisExecutivosQuery)
  const a = useQuery(alertasQuery)
  const kpis = k.data
  const alertas = a.data ?? []

  const criticas = alertas.filter((al) => al.severidade === 'CRITICA').length
  const avisos = alertas.filter((al) => al.severidade === 'AVISO').length

  // Decisão do semáforo
  const tom = criticas > 0 ? 'destructive' : avisos > 0 ? 'warning' : 'success'
  const frase =
    criticas > 0
      ? `${criticas} item${criticas > 1 ? 's' : ''} crítico${criticas > 1 ? 's' : ''} hoje`
      : avisos > 0
        ? `${avisos} aviso${avisos > 1 ? 's' : ''} merece${avisos > 1 ? 'm' : ''} sua atenção`
        : 'Caixa saudável, sem alertas críticos'

  const bolinha =
    tom === 'destructive'
      ? 'bg-red-500'
      : tom === 'warning'
        ? 'bg-amb-400'
        : 'bg-emerald-500'

  return (
    <section className="card-elevated relative overflow-hidden">
      <div className="tarja-amber" />
      <div className="px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-50', bolinha)} />
            <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', bolinha)} />
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Hoje · {frase}
          </p>
        </div>

        <div className="mt-3">
          <p className="label-eyebrow">Saldo geral do grupo</p>
          {k.isLoading ? (
            <div className="mt-1 h-12 w-72 animate-pulse rounded bg-zinc-800/60" />
          ) : (
            <p className="num-mono mt-1 text-[44px] font-extrabold leading-tight text-zinc-50 sm:text-[52px]">
              {formatBRL(kpis?.saldo_geral ?? 0)}
            </p>
          )}
          {kpis ? (
            <p className="mt-2 text-sm text-zinc-400">
              Variação no mês:{' '}
              <span
                className={cn(
                  'num-mono font-semibold',
                  kpis.saldo_variacao_pct >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {kpis.saldo_variacao_pct >= 0 ? '+' : ''}
                {kpis.saldo_variacao_pct.toFixed(1)}%
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
