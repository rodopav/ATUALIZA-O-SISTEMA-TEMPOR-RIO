import * as React from 'react'
import { useQuery, queryOptions } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Skeleton } from '../ui/skeleton'
import { supabase } from '../../lib/supabase'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { Enums } from '../../../../shared/database.types'

type Status = Enums<'status_solicitacao'>

interface FunilRow {
  status: Status
  qtd: number
}

const COLORS: Record<Status, string> = {
  PENDENTE: CHART_COLORS.primary,
  APROVADA: CHART_COLORS.positive,
  REJEITADA: CHART_COLORS.negative,
  CANCELADA: CHART_COLORS.neutral,
}

const LABELS: Record<Status, string> = {
  PENDENTE: 'Pendentes',
  APROVADA: 'Aprovadas',
  REJEITADA: 'Rejeitadas',
  CANCELADA: 'Canceladas',
}

const ORDER: Status[] = ['PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA']

const funilQuery = queryOptions({
  queryKey: ['magnata', 'funil_solicitacoes'] as const,
  queryFn: async (): Promise<FunilRow[]> => {
    const counts: FunilRow[] = []
    for (const status of ORDER) {
      const { count, error } = await supabase
        .from('solicitacoes_saldo')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      if (error) throw error
      counts.push({ status, qtd: count ?? 0 })
    }
    return counts
  },
  staleTime: 60_000,
})

export function SolicitacoesFunilChart(): React.ReactElement {
  const q = useQuery(funilQuery)

  if (q.isLoading) {
    return <Skeleton className="h-[220px] w-full" />
  }

  const data = (q.data ?? []).map((r) => ({
    label: LABELS[r.status],
    qtd: r.qtd,
    color: COLORS[r.status],
  }))

  const total = data.reduce((acc, d) => acc + d.qtd, 0)
  if (total === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Sem solicitações registradas.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
          width={100}
        />
        <Tooltip
          formatter={(value: number) => [`${value}`, 'Quantidade']}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Bar dataKey="qtd" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
