import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Coins, TrendingUp } from 'lucide-react'
import { contasSaldoQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { cn } from '../lib/cn'

type Kind = 'caixa_fisico' | 'investimento'

const CONFIG: Record<
  Kind,
  { title: string; hint: string; icon: React.ReactNode }
> = {
  caixa_fisico: {
    title: 'Caixa Físico por conta',
    hint: 'Dinheiro em espécie (cofres e gavetas) — saldo de cada caixa.',
    icon: <Coins className="h-4 w-4 text-sky-400" />,
  },
  investimento: {
    title: 'Investimentos por conta',
    hint: 'Aplicações (renda fixa, CDB, fundos) — saldo de cada conta.',
    icon: <TrendingUp className="h-4 w-4 text-sky-400" />,
  },
}

/**
 * Box por conta pras contas marcadas como Caixa Físico OU Investimento —
 * espelho da LimitesPorContaList (cheque especial). Mostra uma linha por
 * conta (apelido · banco/empresa · saldo) + total no topo. Renderiza null
 * quando não há contas do tipo.
 */
export function ContasClassificadasList({
  kind,
}: {
  kind: Kind
}): React.ReactElement | null {
  const q = useQuery(contasSaldoQuery)
  const cfg = CONFIG[kind]

  const itens = React.useMemo(
    () =>
      (q.data ?? []).filter((c) =>
        kind === 'caixa_fisico' ? c.is_caixa_fisico : c.is_investimento,
      ),
    [q.data, kind],
  )

  if (q.isLoading) return null
  if (itens.length === 0) return null

  const total = itens.reduce((acc, c) => acc + (c.saldo_atual ?? 0), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {cfg.icon}
            <CardTitle>{cfg.title}</CardTitle>
          </div>
          <span className="num-mono shrink-0 text-sm font-bold text-sky-300">
            {formatBRL(total)}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{cfg.hint}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {itens.map((c) => (
            <li
              key={c.conta_id}
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {c.apelido}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {c.banco ?? '—'}
                  {c.empresa ? ` · ${c.empresa}` : ''}
                </p>
              </div>
              <span
                className={cn(
                  'num-mono shrink-0 text-sm font-bold',
                  (c.saldo_atual ?? 0) < 0 ? 'text-red-400' : 'text-zinc-100',
                )}
              >
                {formatBRL(c.saldo_atual ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
