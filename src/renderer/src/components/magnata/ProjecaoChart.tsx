import * as React from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { ProjecaoPonto } from '../../lib/magnata-queries'

interface ProjecaoChartProps {
  data: ProjecaoPonto[]
}

interface Point {
  data: string
  label: string
  saldo: number
  banda: [number, number]
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

function shortDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function ProjecaoChart({
  data,
}: ProjecaoChartProps): React.ReactElement {
  const points = React.useMemo<Point[]>(
    () =>
      data.map((p) => ({
        data: p.data,
        label: shortDate(p.data),
        saldo: Number(p.saldo_projetado ?? 0),
        banda: [
          Number(p.banda_inferior ?? 0),
          Number(p.banda_superior ?? 0),
        ] as [number, number],
      })),
    [data],
  )

  if (points.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        Sem projeção disponível.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart
        data={points}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id="banda" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primaryDeep} stopOpacity={0.25} />
            <stop offset="95%" stopColor={CHART_COLORS.primaryDeep} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tickFormatter={compactBRL}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          width={70}
        />
        <Tooltip
          formatter={(value: number | number[], name: string) => {
            if (Array.isArray(value)) {
              return [
                `${formatBRL(value[0] ?? 0)} ~ ${formatBRL(value[1] ?? 0)}`,
                'Banda',
              ]
            }
            return [formatBRL(Number(value)), name]
          }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="banda"
          name="Banda de confiança"
          stroke="none"
          fill="url(#banda)"
        />
        <Line
          type="monotone"
          dataKey="saldo"
          name="Projeção"
          stroke={CHART_COLORS.primaryDeep}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
