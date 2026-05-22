import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingDown, Inbox } from 'lucide-react'
import { drillContasNegativasQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'

export function ContasNegativasList(): React.ReactElement {
  const q = useQuery(drillContasNegativasQuery)
  const items = q.data ?? []
  const total = items.reduce((a, b) => a + b.saldo_atual, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Contas no vermelho</CardTitle>
          <span className="num-mono text-sm font-bold text-red-400">{formatBRL(total)}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Contas com saldo abaixo de zero — usando cheque especial ou no negativo sem limite.
        </p>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded bg-zinc-800/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-zinc-700/60 bg-zinc-900/40 p-3 text-xs text-zinc-500">
            <Inbox className="h-4 w-4" />
            Nenhuma conta no negativo.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.conta_id}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-100">{it.apelido}</p>
                  <p className="text-[11px] text-zinc-500">
                    {it.empresa ?? '—'}{' '}
                    <span
                      className={
                        it.tem_limite
                          ? 'ml-1 rounded bg-amb-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amb-400'
                          : 'ml-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400'
                      }
                    >
                      {it.tem_limite ? 'cheque especial' : 'sem limite'}
                    </span>
                  </p>
                </div>
                <span className="num-mono shrink-0 text-sm font-bold text-red-400">
                  {formatBRL(it.saldo_atual)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
