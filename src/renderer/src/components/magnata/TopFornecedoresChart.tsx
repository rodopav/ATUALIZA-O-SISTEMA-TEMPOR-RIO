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
import type { TopFornecedorRow } from '../../lib/magnata-queries'

interface TopFornecedoresChartProps {
  data: TopFornecedorRow[]
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

interface Bucket {
  nome: string
  total: number
  qtd: number
}

export function TopFornecedoresChart({
  data,
}: TopFornecedoresChartProps): React.ReactElement {
  const points = React.useMemo<Bucket[]>(
    () =>
      data
        .filter((r) => r.nome)
        .map((r) => ({
          nome: r.nome ?? '',
          total: Number(r.total_saidas ?? 0),
          qtd: Number(r.qtd_lancamentos ?? 0),
        }))
        .sort((a, b) => b.total - a.total),
    [data],
  )

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem fornecedores com saídas registradas.
      </div>
    )
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(points.length * 38, 240)}
    >
      <BarChart
        data={points}
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
          dataKey="nome"
          type="category"
          tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
          width={160}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, _n, payload) => [
            formatBRL(value),
            `${payload.payload?.qtd ?? 0} lançamento(s)`,
          ]}
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
          dataKey="total"
          fill="hsl(var(--destructive))"
          radius={[0, 4, 4, 0]}
          barSize={16}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
