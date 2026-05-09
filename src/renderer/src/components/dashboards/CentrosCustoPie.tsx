import * as React from 'react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS, CHART_PALETTE } from '../../lib/chart-colors'
import type { CentroCustoDashboardRow } from '../../lib/dashboards-queries'

interface CentrosCustoPieProps {
  data: CentroCustoDashboardRow[]
}

interface PieSlice {
  codigo: string
  nome: string
  value: number
}

/**
 * Estende a paleta sequencial com 2 tons de âmbar para suportar até 10
 * categorias distintas em um único pie sem repetir cores adjacentes.
 */
const PALETTE: readonly string[] = [
  ...CHART_PALETTE,
  'hsl(var(--amb-200))',
  'hsl(var(--amb-600))',
] as const

interface PieLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
  index?: number
}

function renderLabel(props: PieLabelProps): React.ReactNode {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    percent === undefined
  ) {
    return null
  }
  if (percent < 0.04) return null
  const RAD = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RAD)
  const y = cy + radius * Math.sin(-midAngle * RAD)
  return (
    <text
      x={x}
      y={y}
      fill="hsl(0 0% 100%)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

export function CentrosCustoPie({
  data,
}: CentrosCustoPieProps): React.ReactElement {
  const slices = React.useMemo<PieSlice[]>(
    () =>
      data
        .filter((r) => (r.saidas ?? 0) > 0)
        .map((r) => ({
          codigo: r.codigo ?? '—',
          nome: r.centro_custo ?? '—',
          value: r.saidas ?? 0,
        })),
    [data],
  )

  if (slices.length === 0) {
    return (
      <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
        Sem saídas no período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="codigo"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={renderLabel}
          labelLine={false}
          isAnimationActive={false}
        >
          {slices.map((slice, idx) => (
            <Cell
              key={slice.codigo}
              fill={PALETTE[idx % PALETTE.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatBRL(value)}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(_, entry) => {
            const payload = entry?.payload as unknown as PieSlice | undefined
            return payload ? `${payload.codigo} — ${payload.nome}` : ''
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
