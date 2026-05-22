import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Inbox } from 'lucide-react'
import { limitesPorContaQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { cn } from '../lib/cn'

export function LimitesPorContaList(): React.ReactElement | null {
  const q = useQuery(limitesPorContaQuery)
  const items = q.data ?? []
  if (!q.isLoading && items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-amb-400" />
          <CardTitle>Contas com cheque especial</CardTitle>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Detalhe por banco — saldo, limite disponível e % consumido.
        </p>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded bg-zinc-800/60" />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const noLimite = it.pct_consumido > 80
              return (
                <li key={it.conta_id} className="rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{it.apelido}</p>
                      <p className="text-[11px] text-zinc-500">{it.empresa ?? '—'}</p>
                    </div>
                    <span
                      className={cn(
                        'num-mono shrink-0 text-sm font-bold',
                        noLimite ? 'text-red-400' : 'text-zinc-100',
                      )}
                    >
                      {formatBRL(it.total_disponivel)}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={cn(
                        'h-full transition-all',
                        noLimite ? 'bg-red-500' : it.pct_consumido > 50 ? 'bg-amb-400' : 'bg-emerald-500',
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, it.pct_consumido))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-zinc-500">
                    <span>
                      saldo {formatBRL(it.saldo)} · limite {formatBRL(it.valor_limite)}
                    </span>
                    <span className={cn('font-bold', noLimite && 'text-red-400')}>
                      {it.pct_consumido.toFixed(0)}% usado
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
