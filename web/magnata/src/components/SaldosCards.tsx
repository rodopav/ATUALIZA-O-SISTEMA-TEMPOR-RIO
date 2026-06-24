import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Coins, TrendingUp, ScrollText, CreditCard } from 'lucide-react'
import { kpisExecutivosQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { KpiCard } from './KpiCard'

// Tailwind precisa de classes estáticas — mapa por quantidade de cards.
const GRID_BY_COUNT: Record<number, string> = {
  3: 'grid gap-3 sm:grid-cols-3',
  4: 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4',
  5: 'grid gap-3 sm:grid-cols-3 xl:grid-cols-5',
}

/**
 * 3 a 5 cards: Saldo Contas / Caixa físico / (Investimentos) / Saldo Geral /
 * (Limite disponível). Limite e investimento aparecem só quando há valor.
 * Limite NÃO entra no Saldo Geral — é dívida potencial, não dinheiro real.
 */
export function SaldosCards(): React.ReactElement {
  const q = useQuery(kpisExecutivosQuery)
  const k = q.data
  const loading = q.isLoading
  const hasLimite = (k?.limite_total_disponivel ?? 0) > 0
  const hasInvestimento = (k?.saldo_investimentos ?? 0) !== 0
  const cardCount = 3 + (hasInvestimento ? 1 : 0) + (hasLimite ? 1 : 0)

  return (
    <div className="space-y-3">
    <div className={GRID_BY_COUNT[cardCount] ?? GRID_BY_COUNT[3]}>
      <KpiCard
        label="Saldo das contas"
        icone={<Wallet className="h-4 w-4" />}
        loading={loading}
        valor={formatBRL(k?.saldo_contas ?? 0)}
        hint="Bancárias (exceto caixa físico e investimentos)"
      />
      <KpiCard
        label="Saldo Caixa físico"
        icone={<Coins className="h-4 w-4" />}
        tom="info"
        loading={loading}
        valor={formatBRL(k?.saldo_caixa_fisico ?? 0)}
        hint="Cofres e gavetas"
      />
      {hasInvestimento ? (
        <KpiCard
          label="Saldo Investimentos"
          icone={<TrendingUp className="h-4 w-4" />}
          tom="info"
          loading={loading}
          valor={formatBRL(k?.saldo_investimentos ?? 0)}
          hint="Aplicações (renda fixa, fundos)"
        />
      ) : null}
      <KpiCard
        label="Saldo Geral"
        icone={<ScrollText className="h-4 w-4" />}
        tom="success"
        loading={loading}
        valor={formatBRL(k?.saldo_geral ?? 0)}
        hint="Contas + caixa físico + investimentos"
      />
      {hasLimite ? (
        <KpiCard
          label="Limite disponível"
          icone={<CreditCard className="h-4 w-4" />}
          tom="warning"
          loading={loading}
          valor={formatBRL(k?.limite_total_disponivel ?? 0)}
          hint="Cheque especial — fora do Saldo Geral"
        />
      ) : null}
    </div>

      {/* Cálculo do Saldo Geral explícito — composição verificável. */}
      {!loading ? (
        <p className="px-1 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-200">Saldo Geral</span> ={' '}
          {formatBRL(k?.saldo_contas ?? 0)} (contas) +{' '}
          {formatBRL(k?.saldo_caixa_fisico ?? 0)} (caixa físico)
          {hasInvestimento ? (
            <> + {formatBRL(k?.saldo_investimentos ?? 0)} (investimentos)</>
          ) : null}{' '}
          ={' '}
          <span className="font-semibold text-zinc-200">
            {formatBRL(k?.saldo_geral ?? 0)}
          </span>
        </p>
      ) : null}
    </div>
  )
}
