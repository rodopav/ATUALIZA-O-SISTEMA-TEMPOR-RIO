import * as React from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS } from '../../lib/chart-colors'

export interface SparklinePoint {
  data: string
  saldo: number
}

interface KpiSparklineProps {
  data: SparklinePoint[]
  positive: boolean
}

export function KpiSparkline({
  data,
  positive,
}: KpiSparklineProps): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={42}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis hide dataKey="data" />
        <Bar
          dataKey="saldo"
          fill={positive ? CHART_COLORS.positive : CHART_COLORS.negative}
          radius={[2, 2, 0, 0]}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            borderRadius: 6,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 11,
            padding: '4px 8px',
          }}
          formatter={(value: number) => [formatBRL(value), 'Saldo']}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
