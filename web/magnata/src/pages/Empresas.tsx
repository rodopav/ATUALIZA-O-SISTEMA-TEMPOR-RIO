import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { PageTitle, Section } from './VisaoGeral'
import { Card, CardContent } from '../components/ui/Card'
import { saldoPorEmpresaQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { cn } from '../lib/cn'

export function Empresas(): React.ReactElement {
  const q = useQuery(saldoPorEmpresaQuery)
  const items = q.data ?? []
  const total = items.reduce((s, r) => s + r.saldo_total, 0)
  const maxAbs = items.reduce((m, r) => Math.max(m, Math.abs(r.saldo_total)), 0) || 1

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Grupo" title="Empresas" />

      <Section label={`Total consolidado: ${formatBRL(total)}`}>
        <Card>
          <CardContent className="p-3 sm:p-4">
            {q.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 w-full animate-pulse rounded bg-zinc-800/60" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma empresa visível.</p>
            ) : (
              <ul className="space-y-2.5">
                {items.map((e) => {
                  const pct = (Math.abs(e.saldo_total) / maxAbs) * 100
                  const neg = e.saldo_total < 0
                  return (
                    <li key={e.empresa_id} className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-100">{e.empresa}</p>
                            <p className="text-[10px] text-zinc-500">{e.qtd_contas} conta(s)</p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'num-mono shrink-0 text-sm font-bold',
                            neg ? 'text-red-400' : 'text-zinc-50',
                          )}
                        >
                          {formatBRL(e.saldo_total)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={cn('h-full', neg ? 'bg-red-500' : 'bg-emerald-500')}
                          style={{ width: `${pct}%` }}
                        />
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
