import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, TrendingUp, TrendingDown } from 'lucide-react'
import { PageTitle, Section } from './VisaoGeral'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { fluxoMensalQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'

/**
 * Tendências: regressão linear simples sobre os últimos 12 meses de líquido.
 * Calcula slope (R$/mês) e mostra projeção dos próximos 3 meses.
 */
export function Tendencias(): React.ReactElement {
  const q = useQuery(fluxoMensalQuery)
  const meses = (q.data ?? []).slice(-12)

  // Regressão linear y = a*x + b
  const n = meses.length
  let slope = 0
  let intercept = 0
  if (n >= 2) {
    const xs = meses.map((_, i) => i)
    const ys = meses.map((m) => m.liquido)
    const meanX = xs.reduce((s, v) => s + v, 0) / n
    const meanY = ys.reduce((s, v) => s + v, 0) / n
    let num = 0
    let den = 0
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY)
      den += (xs[i] - meanX) ** 2
    }
    slope = den === 0 ? 0 : num / den
    intercept = meanY - slope * meanX
  }
  const proj = [n, n + 1, n + 2].map((x) => slope * x + intercept)

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Análise" title="Tendências" />

      <Section label="Regressão linear (últimos 12 meses)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {slope >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <CardTitle>Direção</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p
                className={
                  'num-mono text-[24px] sm:text-[28px] font-extrabold ' +
                  (slope >= 0 ? 'text-emerald-400' : 'text-red-400')
                }
              >
                {slope >= 0 ? '+' : ''}
                {formatBRL(slope)}/mês
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Líquido médio cresce/cai por mês no ritmo atual.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-amb-400" />
                <CardTitle>Projeção 3 meses</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {proj.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">+{i + 1} mês</span>
                  <span
                    className={
                      'num-mono font-bold ' + (v >= 0 ? 'text-emerald-400' : 'text-red-400')
                    }
                  >
                    {formatBRL(v)}
                  </span>
                </div>
              ))}
              <p className="pt-2 text-[10px] text-zinc-500">
                Projeção estatística — não considera entradas/saídas atípicas previstas.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {n < 3 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-zinc-500">
            Precisa de pelo menos 3 meses de histórico pra tendência ser confiável.
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
