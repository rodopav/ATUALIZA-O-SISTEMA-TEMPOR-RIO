import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Coins, TrendingUp, ScrollText, CreditCard } from 'lucide-react'
import { StatCard } from './StatCard'
import { saldosConsolidadosQuery } from '../../lib/dashboards-queries'
import { formatBRL } from '../../lib/format'

/**
 * Cards de saldos consolidados — Contas, Caixa físico, Saldo Geral
 * (soma dos dois) e Limite Disponível (separado, NÃO soma no geral).
 * Usa RPC que respeita RLS — usuário comum só soma o que tem pode_ver_conta.
 */
// Tailwind precisa de classes estáticas — mapa por quantidade de cards.
const GRID_BY_COUNT: Record<number, string> = {
  3: 'grid gap-4 md:grid-cols-3',
  4: 'grid gap-4 md:grid-cols-2 xl:grid-cols-4',
  5: 'grid gap-4 md:grid-cols-3 xl:grid-cols-5',
}

export function SaldosConsolidadosCards(): React.ReactElement {
  const q = useQuery(saldosConsolidadosQuery)
  const data = q.data
  const loading = q.isLoading
  const hasLimite = (data?.saldo_limite_total ?? 0) > 0
  // Card de investimentos aparece só quando há saldo investido (igual ao
  // limite) — mantém o dashboard limpo pra quem não usa.
  const hasInvestimento = (data?.saldo_investimentos ?? 0) !== 0
  const cardCount = 3 + (hasInvestimento ? 1 : 0) + (hasLimite ? 1 : 0)

  return (
    <div className="space-y-2">
    <div className={GRID_BY_COUNT[cardCount] ?? GRID_BY_COUNT[3]}>
      <StatCard
        icon={<Wallet className="h-4 w-4" />}
        label="Saldo das contas"
        value={formatBRL(data?.saldo_contas ?? 0)}
        loading={loading}
        description="Bancárias visíveis (exceto caixa físico e investimentos)"
      />
      <StatCard
        icon={<Coins className="h-4 w-4" />}
        label="Saldo Caixa físico"
        value={formatBRL(data?.saldo_caixa_fisico ?? 0)}
        loading={loading}
        description="Contas marcadas como caixa físico"
        accent="info"
      />
      {hasInvestimento ? (
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Saldo Investimentos"
          value={formatBRL(data?.saldo_investimentos ?? 0)}
          loading={loading}
          description="Contas marcadas como investimento"
          accent="info"
        />
      ) : null}
      <StatCard
        icon={<ScrollText className="h-4 w-4" />}
        label="Saldo Geral"
        value={formatBRL(data?.saldo_geral ?? 0)}
        loading={loading}
        description="Contas + caixa físico + investimentos"
        accent="success"
      />
      {hasLimite ? (
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Limite disponível"
          value={formatBRL(data?.saldo_limite_total ?? 0)}
          loading={loading}
          description="Cheque especial das contas — fora do Saldo Geral"
          accent="destructive"
        />
      ) : null}
    </div>

      {/* Cálculo do Saldo Geral explícito — composição verificável. */}
      {!loading ? (
        <p className="px-1 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Saldo Geral</span> ={' '}
          {formatBRL(data?.saldo_contas ?? 0)} (contas) +{' '}
          {formatBRL(data?.saldo_caixa_fisico ?? 0)} (caixa físico)
          {hasInvestimento ? (
            <> + {formatBRL(data?.saldo_investimentos ?? 0)} (investimentos)</>
          ) : null}{' '}
          ={' '}
          <span className="font-semibold text-foreground">
            {formatBRL(data?.saldo_geral ?? 0)}
          </span>
        </p>
      ) : null}
    </div>
  )
}
