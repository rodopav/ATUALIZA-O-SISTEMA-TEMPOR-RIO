import * as React from 'react'
import {
  Bar,
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
import type { FluxoMensalRow } from '../../lib/magnata-queries'

interface FluxoMensalChartProps {
  data: FluxoMensalRow[]
}

interface Point {
  label: string
  entradas: number
  saidas: number
  liquido: number
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

function shortMonth(periodo: string | null): string {
  if (!periodo || !/^\d{4}-\d{2}-\d{2}$/.test(periodo)) return periodo ?? ''
  const [yStr, mStr] = periodo.split('-')
  const y = Number.parseInt(yStr ?? '', 10)
  const m = Number.parseInt(mStr ?? '', 10)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return periodo
  const meses = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  return `${meses[m - 1] ?? ''}/${String(y).slice(-2)}`
}

export function FluxoMensalChart({
  data,
}: FluxoMensalChartProps): React.ReactElement {
  const points = React.useMemo<Point[]>(() => {
    if (data.length === 0) return []
    const sorted = [...data].sort((a, b) =>
      (a.periodo ?? '').localeCompare(b.periodo ?? ''),
    )
    return sorted.slice(-12).map((r) => ({
      label: shortMonth(r.periodo),
      entradas: Number(r.entradas ?? 0),
      saidas: Number(r.saidas ?? 0),
      liquido: Number(r.liquido ?? 0),
    }))
  }, [data])

  if (points.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        Sem fluxo nos últimos 12 meses.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart
        data={points}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={compactBRL}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatBRL(value),
            name,
          ]}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
            padding: '8px 12px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="entradas"
          name="Entradas"
          fill={CHART_COLORS.positive}
          radius={[4, 4, 0, 0]}
          barSize={16}
        />
        <Bar
          dataKey="saidas"
          name="Saídas"
          fill={CHART_COLORS.negative}
          radius={[4, 4, 0, 0]}
          barSize={16}
        />
        <Line
          type="monotone"
          dataKey="liquido"
          name="Líquido"
          stroke={CHART_COLORS.primaryDeep}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.primaryDeep }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
