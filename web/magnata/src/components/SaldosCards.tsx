import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Coins, ScrollText, CreditCard } from 'lucide-react'
import { kpisExecutivosQuery } from '../lib/queries'
import { formatBRL } from '../lib/format'
import { KpiCard } from './KpiCard'

/**
 * 3 ou 4 cards: Saldo Contas / Caixa físico / Saldo Geral / (Limite disponível se houver).
 * Limite NÃO entra no Saldo Geral — é dívida potencial, não dinheiro real.
 */
export function SaldosCards(): React.ReactElement {
  const q = useQuery(kpisExecutivosQuery)
  const k = q.data
  const loading = q.isLoading
  const hasLimite = (k?.limite_total_disponivel ?? 0) > 0

  return (
    <div className={hasLimite ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4' : 'grid gap-3 sm:grid-cols-3'}>
      <KpiCard
        label="Saldo das contas"
        icone={<Wallet className="h-4 w-4" />}
        loading={loading}
        valor={formatBRL(k?.saldo_contas ?? 0)}
        hint="Bancárias (exceto caixa físico)"
      />
      <KpiCard
        label="Saldo Caixa físico"
        icone={<Coins className="h-4 w-4" />}
        tom="info"
        loading={loading}
        valor={formatBRL(k?.saldo_caixa_fisico ?? 0)}
        hint="Cofres e gavetas"
      />
      <KpiCard
        label="Saldo Geral"
        icone={<ScrollText className="h-4 w-4" />}
        tom="success"
        loading={loading}
        valor={formatBRL(k?.saldo_geral ?? 0)}
        hint="Contas + caixa físico"
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
  )
}
