import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Equal } from 'lucide-react'
import { PageTitle, Section } from './VisaoGeral'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { fluxoMensalQuery } from '../lib/queries'
import { formatBRLAuto, useIsMobile } from '../lib/format'
import { cn } from '../lib/cn'

const MES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function nomeMes(periodo: string): string {
  const [y, m] = periodo.slice(0, 7).split('-')
  return `${MES_PT[Number(m) - 1] ?? '?'}/${y?.slice(2)}`
}

export function Fluxo(): React.ReactElement {
  const q = useQuery(fluxoMensalQuery)
  const isMobile = useIsMobile()
  const meses = q.data ?? []

  const ultimos12 = meses.slice(-12)
  const maxAbs = ultimos12.reduce((m, r) => Math.max(m, r.entradas, r.saidas), 0) || 1

  const totalEntradas = ultimos12.reduce((s, r) => s + r.entradas, 0)
  const totalSaidas = ultimos12.reduce((s, r) => s + r.saidas, 0)
  const totalLiquido = totalEntradas - totalSaidas

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Operacional" title="Fluxo de caixa" />

      <Section label="Últimos 12 meses (operacional)">
        <div className="grid gap-3 sm:grid-cols-3">
          <ResumoBox
            label="Entradas"
            valor={formatBRLAuto(totalEntradas, isMobile)}
            tom="success"
            icone={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <ResumoBox
            label="Saídas"
            valor={formatBRLAuto(totalSaidas, isMobile)}
            tom="destructive"
            icone={<TrendingDown className="h-3.5 w-3.5" />}
          />
          <ResumoBox
            label="Líquido"
            valor={formatBRLAuto(totalLiquido, isMobile)}
            tom={totalLiquido >= 0 ? 'success' : 'destructive'}
            icone={<Equal className="h-3.5 w-3.5" />}
          />
        </div>
      </Section>

      <Section label="Barras mês a mês">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo mensal operacional</CardTitle>
            <p className="mt-1 text-xs text-zinc-500">
              Entradas e saídas mês a mês. Transferências internas não contam.
            </p>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="h-48 w-full animate-pulse rounded bg-zinc-800/60" />
            ) : ultimos12.length === 0 ? (
              <p className="text-sm text-zinc-500">Sem dados de fluxo.</p>
            ) : (
              <div className="space-y-2.5">
                {ultimos12.map((r) => {
                  const ePct = (r.entradas / maxAbs) * 100
                  const sPct = (r.saidas / maxAbs) * 100
                  return (
                    <div key={r.periodo}>
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-medium text-zinc-300">{nomeMes(r.periodo)}</span>
                        <span
                          className={cn(
                            'num-mono font-bold',
                            r.liquido >= 0 ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {formatBRLAuto(r.liquido, true)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-emerald-500" style={{ width: `${ePct}%` }} />
                        </div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full bg-red-500" style={{ width: `${sPct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="mt-3 flex items-center gap-3 border-t border-zinc-800/60 pt-2 text-[10px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Entradas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Saídas
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}

function ResumoBox({
  label,
  valor,
  tom,
  icone,
}: {
  label: string
  valor: string
  tom: 'success' | 'destructive' | 'default'
  icone: React.ReactNode
}): React.ReactElement {
  return (
    <div
      className={cn(
        'card overflow-hidden p-3 sm:p-4',
        tom === 'success' && 'border-emerald-500/20',
        tom === 'destructive' && 'border-red-500/20',
      )}
    >
      <div className="flex items-center gap-2 text-zinc-400">
        {icone}
        <p className="text-[10px] font-bold uppercase tracking-[1.5px]">{label}</p>
      </div>
      <p
        className={cn(
          'num-mono mt-1.5 truncate text-[20px] sm:text-[24px] font-extrabold',
          tom === 'success' && 'text-emerald-400',
          tom === 'destructive' && 'text-red-400',
        )}
      >
        {valor}
      </p>
    </div>
  )
}
