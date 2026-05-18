import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Coins, ScrollText, CreditCard } from 'lucide-react'
import { StatCard } from './StatCard'
import { saldosConsolidadosQuery } from '../../lib/dashboards-queries'
import { formatBRL } from '../../lib/format'

/**
 * Cards de saldos consolidados — Contas, Caixa físico, Saldo Geral
 * (soma dos dois) e Limite Disponível (separado, NÃO soma no geral).
 * Usa RPC que respeita RLS — usuário comum só soma o que tem pode_ver_conta.
 */
export function SaldosConsolidadosCards(): React.ReactElement {
  const q = useQuery(saldosConsolidadosQuery)
  const data = q.data
  const loading = q.isLoading
  const hasLimite = (data?.saldo_limite_total ?? 0) > 0

  return (
    <div
      className={
        hasLimite
          ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-4'
          : 'grid gap-4 md:grid-cols-3'
      }
    >
      <StatCard
        icon={<Wallet className="h-4 w-4" />}
        label="Saldo das contas"
        value={formatBRL(data?.saldo_contas ?? 0)}
        loading={loading}
        description="Bancárias visíveis (exceto caixa físico)"
      />
      <StatCard
        icon={<Coins className="h-4 w-4" />}
        label="Saldo Caixa físico"
        value={formatBRL(data?.saldo_caixa_fisico ?? 0)}
        loading={loading}
        description="Contas marcadas como caixa físico"
        accent="info"
      />
      <StatCard
        icon={<ScrollText className="h-4 w-4" />}
        label="Saldo Geral"
        value={formatBRL(data?.saldo_geral ?? 0)}
        loading={loading}
        description="Contas + caixa físico"
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
  )
}
