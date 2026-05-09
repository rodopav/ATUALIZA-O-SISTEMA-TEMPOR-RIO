import * as React from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { FluxoDiarioRow } from '../../lib/magnata-queries'

interface BurnRateChartProps {
  data: FluxoDiarioRow[]
}

interface Point {
  data: string
  label: string
  saidas: number
  ma7: number | null
}

function compactBRL(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })}k`
  }
  return formatBRL(value)
}

function shortDate(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function BurnRateChart({
  data,
}: BurnRateChartProps): React.ReactElement {
  const points = React.useMemo<Point[]>(() => {
    if (data.length === 0) return []
    const sorted = [...data].sort((a, b) =>
      (a.data ?? '').localeCompare(b.data ?? ''),
    )
    return sorted.map((r, i, all) => {
      const saidas = Number(r.saidas ?? 0)
      // Média móvel 7 dias.
      const start = Math.max(0, i - 6)
      const slice = all.slice(start, i + 1)
      const ma7 =
        slice.length >= 7
          ? slice.reduce((acc, x) => acc + Number(x.saidas ?? 0), 0) /
            slice.length
          : null
      return {
        data: r.data ?? '',
        label: shortDate(r.data),
        saidas,
        ma7,
      }
    })
  }, [data])

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem dados diários para burn rate.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          interval="preserveStartEnd"
          minTickGap={20}
        />
        <YAxis
          tickFormatter={compactBRL}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          width={70}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatBRL(value), name]}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="saidas"
          name="Saídas diárias"
          stroke={CHART_COLORS.negative}
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="ma7"
          name="Média móvel 7d"
          stroke={CHART_COLORS.primaryDeep}
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
