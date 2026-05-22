import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Coins, ShieldCheck, Clock } from 'lucide-react'
import { PageTitle, Section } from './VisaoGeral'
import { KpiCard } from '../components/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { kpisExecutivosQuery, contasSaldoQuery } from '../lib/queries'
import { formatBRL, formatBRLAuto, useIsMobile } from '../lib/format'
import { cn } from '../lib/cn'

export function Liquidez(): React.ReactElement {
  const k = useQuery(kpisExecutivosQuery)
  const contas = useQuery(contasSaldoQuery)
  const isMobile = useIsMobile()

  const ranking = (contas.data ?? []).slice(0, 10)

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Tesouraria" title="Liquidez" />

      <Section label="Visão consolidada">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Liquidez imediata"
            icone={<ShieldCheck className="h-4 w-4" />}
            tom="success"
            loading={k.isLoading}
            valor={formatBRLAuto(k.data?.liquidez_imediata ?? 0, isMobile)}
            hint="Saldo positivo (sem usar limite)"
          />
          <KpiCard
            label="Saldo das contas"
            icone={<Wallet className="h-4 w-4" />}
            loading={k.isLoading}
            valor={formatBRLAuto(k.data?.saldo_contas ?? 0, isMobile)}
            hint="Bancos (exceto caixa físico)"
          />
          <KpiCard
            label="Caixa físico"
            icone={<Coins className="h-4 w-4" />}
            tom="info"
            loading={k.isLoading}
            valor={formatBRLAuto(k.data?.saldo_caixa_fisico ?? 0, isMobile)}
            hint="Cofre + gavetas"
          />
          <KpiCard
            label="Fôlego do caixa"
            icone={<Clock className="h-4 w-4" />}
            tom={
              k.data?.runway_meses == null
                ? 'default'
                : k.data.runway_meses < 3
                  ? 'destructive'
                  : k.data.runway_meses < 6
                    ? 'warning'
                    : 'success'
            }
            loading={k.isLoading}
            valor={
              k.data?.runway_meses != null
                ? `${k.data.runway_meses.toFixed(1)} m`
                : (k.data?.runway_dias_historico ?? 0) < 14
                  ? '—'
                  : '∞'
            }
            hint="Meses no ritmo atual"
          />
        </div>
      </Section>

      <Section label="Ranking de contas">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 contas por saldo</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">Maiores saldos do grupo no momento.</p>
          </CardHeader>
          <CardContent>
            {contas.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded bg-zinc-800/60" />
                ))}
              </div>
            ) : ranking.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma conta visível.</p>
            ) : (
              <ul className="space-y-1.5">
                {ranking.map((c, idx) => {
                  const neg = c.saldo_atual < 0
                  return (
                    <li
                      key={c.conta_id}
                      className="flex items-center gap-3 rounded-md border border-zinc-800/60 bg-zinc-900/40 px-3 py-2"
                    >
                      <span className="num-mono w-6 shrink-0 text-[10px] text-zinc-500">#{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{c.apelido}</p>
                        <p className="text-[10px] text-zinc-500">
                          {c.banco ?? 'sem banco'}
                          {c.is_caixa_fisico ? ' · caixa físico' : ''}
                          {c.tem_limite ? ' · com cheque especial' : ''}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'num-mono shrink-0 text-sm font-bold',
                          neg ? 'text-red-400' : 'text-zinc-100',
                        )}
                      >
                        {formatBRL(c.saldo_atual)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}
