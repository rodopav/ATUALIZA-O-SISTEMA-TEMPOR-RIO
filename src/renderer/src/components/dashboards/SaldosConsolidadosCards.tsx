import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Coins, ScrollText } from 'lucide-react'
import { StatCard } from './StatCard'
import { saldosConsolidadosQuery } from '../../lib/dashboards-queries'
import { formatBRL } from '../../lib/format'

/**
 * Trio de cards "Saldo das contas / Caixa físico / Saldo geral".
 * Plugue no topo dos dashboards. Usa RPC que respeita RLS — usuário
 * comum só soma o que tem pode_ver_conta.
 */
export function SaldosConsolidadosCards(): React.ReactElement {
  const q = useQuery(saldosConsolidadosQuery)
  const data = q.data
  const loading = q.isLoading

  return (
    <div className="grid gap-4 md:grid-cols-3">
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
    </div>
  )
}
