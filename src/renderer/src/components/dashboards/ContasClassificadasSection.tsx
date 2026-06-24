import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Coins, TrendingUp } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { contasSaldoQuery } from '../../lib/contas-saldo-queries'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'

type Kind = 'caixa_fisico' | 'investimento'

const CONFIG: Record<
  Kind,
  { title: string; desc: string; icon: React.ReactNode; accent: string }
> = {
  caixa_fisico: {
    title: 'Caixa Físico por conta',
    desc: 'Dinheiro em espécie (cofres e gavetas) — saldo de cada caixa.',
    icon: <Coins className="h-4 w-4 text-blu-500" />,
    accent: 'text-blu-600',
  },
  investimento: {
    title: 'Investimentos por conta',
    desc: 'Aplicações (renda fixa, CDB, fundos) — saldo de cada conta.',
    icon: <TrendingUp className="h-4 w-4 text-blu-500" />,
    accent: 'text-blu-600',
  },
}

/**
 * Box por conta pras contas marcadas como Caixa Físico OU Investimento —
 * mesma pegada visual da seção de cheque especial. Mostra uma linha por
 * conta (apelido · banco/empresa · saldo) e o total. Renderiza null quando
 * não há contas do tipo, pra não poluir o dashboard de quem não usa.
 */
export function ContasClassificadasSection({
  kind,
}: {
  kind: Kind
}): React.ReactElement | null {
  const q = useQuery(contasSaldoQuery)
  const cfg = CONFIG[kind]

  const linhas = React.useMemo(
    () =>
      (q.data ?? []).filter((c) =>
        kind === 'caixa_fisico' ? c.is_caixa_fisico : c.is_investimento,
      ),
    [q.data, kind],
  )

  if (q.isLoading) return null
  if (linhas.length === 0) return null

  const total = linhas.reduce((acc, c) => acc + (c.saldo_atual ?? 0), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {cfg.icon}
            {cfg.title}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{cfg.desc}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
            Total
          </p>
          <p
            className={cn(
              'font-mono text-base font-extrabold tabular-nums',
              cfg.accent,
            )}
          >
            {formatBRL(total)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-2">
        {linhas.map((c) => (
          <div
            key={c.conta_id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {c.apelido}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {c.banco ?? '—'}
                {c.empresa ? ` · ${c.empresa}` : ''}
              </p>
            </div>
            <p
              className={cn(
                'shrink-0 font-mono text-base font-extrabold tabular-nums',
                (c.saldo_atual ?? 0) < 0 ? 'text-destructive' : cfg.accent,
              )}
            >
              {formatBRL(c.saldo_atual ?? 0)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
