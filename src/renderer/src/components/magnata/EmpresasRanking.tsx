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
import { CHART_COLORS } from '../../lib/chart-colors'
import type { SaldoPorEmpresaRow } from '../../lib/magnata-queries'

interface EmpresasRankingProps {
  data: SaldoPorEmpresaRow[]
}

interface Point {
  empresa: string
  saldo: number
  contas: number
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

export function EmpresasRanking({
  data,
}: EmpresasRankingProps): React.ReactElement {
  const points = React.useMemo<Point[]>(
    () =>
      data
        .map((r) => ({
          empresa:
            r.nome_fantasia ?? r.razao_social ?? r.empresa_id?.slice(0, 8) ?? '—',
          saldo: Number(r.saldo_total ?? 0),
          contas: Number(r.qtd_contas ?? 0),
        }))
        .sort((a, b) => b.saldo - a.saldo),
    [data],
  )

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem empresas cadastradas.
      </div>
    )
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(points.length * 44, 220)}
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
          dataKey="empresa"
          type="category"
          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
          width={160}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, _n, payload) => [
            formatBRL(value),
            `${payload.payload?.contas ?? 0} conta(s)`,
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
          dataKey="saldo"
          fill={CHART_COLORS.primaryDeep}
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
