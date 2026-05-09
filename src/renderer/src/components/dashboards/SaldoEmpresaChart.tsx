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
import { formatBRL } from '../../lib/format'
import type { SaldoGeralRow } from '../../lib/queries'

interface SaldoEmpresaChartProps {
  data: SaldoGeralRow[]
}

interface ChartItem {
  empresa: string
  saldo: number
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

export function SaldoEmpresaChart({
  data,
}: SaldoEmpresaChartProps): React.ReactElement {
  const items = React.useMemo<ChartItem[]>(() => {
    const map = new Map<string, number>()
    for (const row of data) {
      const key = row.empresa ?? '—'
      map.set(key, (map.get(key) ?? 0) + (row.saldo_atual ?? 0))
    }
    return Array.from(map.entries())
      .map(([empresa, saldo]) => ({ empresa, saldo }))
      .sort((a, b) => b.saldo - a.saldo)
  }, [data])

  if (items.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(items.length * 40, 220)}>
      <BarChart
        data={items}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
        />
        <XAxis
          type="number"
          tickFormatter={compactBRL}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="empresa"
          type="category"
          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
          width={140}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [formatBRL(value), 'Saldo atual']}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
            padding: '8px 12px',
          }}
        />
        <Bar
          dataKey="saldo"
          fill="hsl(var(--primary))"
          radius={[0, 4, 4, 0]}
          barSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
