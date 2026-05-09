import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { CentroCustoDashboardRow } from '../../lib/dashboards-queries'

interface CentrosCustoChartProps {
  data: CentroCustoDashboardRow[]
}

interface ChartItem {
  codigo: string
  nome: string
  entradas: number
  saidas: number
}

function compactBRL(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })}k`
  }
  return formatBRL(value)
}

export function CentrosCustoChart({
  data,
}: CentrosCustoChartProps): React.ReactElement {
  const items = React.useMemo<ChartItem[]>(
    () =>
      data.map((r) => ({
        codigo: r.codigo ?? '—',
        nome: r.centro_custo ?? '—',
        entradas: r.entradas ?? 0,
        saidas: r.saidas ?? 0,
      })),
    [data],
  )

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={items}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="codigo" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={compactBRL} tick={{ fontSize: 12 }} width={80} />
        <Tooltip
          formatter={(value: number) => formatBRL(value)}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload as ChartItem | undefined
            return item ? `${item.codigo} — ${item.nome}` : String(label)
          }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="entradas"
          name="Entradas"
          fill={CHART_COLORS.positive}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="saidas"
          name="Saídas"
          fill={CHART_COLORS.negative}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
