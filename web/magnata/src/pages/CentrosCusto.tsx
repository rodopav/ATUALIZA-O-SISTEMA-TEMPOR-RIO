import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { PieChart } from 'lucide-react'
import { PageTitle, Section } from './VisaoGeral'
import { Card, CardContent } from '../components/ui/Card'
import { centrosCustoSaidasQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/cn'

export function CentrosCusto(): React.ReactElement {
  const q = useQuery(centrosCustoSaidasQuery)
  const items = q.data ?? []
  const total = items.reduce((s, r) => s + r.total_saidas, 0)

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Operacional" title="Centros de custo" />

      <Section label={`Saídas do mês — ${items.length} centros`}>
        <Card>
          <CardContent className="p-3 sm:p-4">
            {q.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded bg-zinc-800/60" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum lançamento operacional este mês.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((c) => {
                  const pct = total > 0 ? (c.total_saidas / total) * 100 : 0
                  return (
                    <li
                      key={c.centro_custo_id}
                      className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <PieChart className="h-3.5 w-3.5 shrink-0 text-amb-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-100">
                              <span className="text-zinc-500">{c.codigo}</span> · {c.nome}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {c.qtd_lancamentos} lançamento(s)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={cn(
                              'num-mono shrink-0 text-sm font-bold text-red-300',
                            )}
                          >
                            {formatBRL(c.total_saidas)}
                          </p>
                          <p className="text-[9px] text-zinc-500">{pct.toFixed(1)}% do mês</p>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full bg-amb-400/70" style={{ width: `${pct}%` }} />
                      </div>
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
