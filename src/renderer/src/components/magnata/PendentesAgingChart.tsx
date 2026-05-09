import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { Tables } from '../../../../shared/database.types'

type Row = Tables<'v_pendentes_conciliacao'>

interface PendentesAgingChartProps {
  data: Row[]
}

interface Bucket {
  faixa: string
  qtd: number
}

function bucketFor(diasAtras: number): string {
  if (diasAtras <= 7) return '0-7 dias'
  if (diasAtras <= 15) return '8-15 dias'
  if (diasAtras <= 30) return '16-30 dias'
  return '31+ dias'
}

function diffDays(iso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 0
  const [y, m, d] = iso.split('-').map((n) => Number.parseInt(n, 10))
  if (y === undefined || m === undefined || d === undefined) return 0
  const dt = new Date(y, m - 1, d).getTime()
  if (!Number.isFinite(dt)) return 0
  return Math.max(0, Math.floor((Date.now() - dt) / (24 * 60 * 60 * 1000)))
}

const ORDER = ['0-7 dias', '8-15 dias', '16-30 dias', '31+ dias']

export function PendentesAgingChart({
  data,
}: PendentesAgingChartProps): React.ReactElement {
  const buckets = React.useMemo<Bucket[]>(() => {
    const counts = new Map<string, number>()
    for (const r of data) {
      if (!r.data) continue
      const dias = diffDays(r.data)
      const key = bucketFor(dias)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return ORDER.map((faixa) => ({ faixa, qtd: counts.get(faixa) ?? 0 }))
  }, [data])

  const total = buckets.reduce((acc, b) => acc + b.qtd, 0)

  if (total === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Nenhum lançamento pendente.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={buckets}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="faixa"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          formatter={(value: number) => [`${value} lançamento(s)`, 'Quantidade']}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Bar dataKey="qtd" fill={CHART_COLORS.primaryDeep} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
