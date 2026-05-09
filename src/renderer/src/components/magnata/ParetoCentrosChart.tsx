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
import type { Tables } from '../../../../shared/database.types'

type CentroCustoDashRow = Tables<'v_dashboard_centro_custo'>

interface ParetoCentrosChartProps {
  data: CentroCustoDashRow[]
}

interface Point {
  nome: string
  saidas: number
  acumulado: number
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

export function ParetoCentrosChart({
  data,
}: ParetoCentrosChartProps): React.ReactElement {
  const points = React.useMemo<Point[]>(() => {
    if (data.length === 0) return []
    // Agrupar por centro_custo (caso venha com múltiplos períodos), pegar saídas absolutas.
    const map = new Map<string, number>()
    for (const r of data) {
      const nome = r.centro_custo ?? r.codigo ?? '—'
      const saidas = Math.abs(Number(r.saidas ?? 0))
      map.set(nome, (map.get(nome) ?? 0) + saidas)
    }
    const sorted = Array.from(map.entries())
      .map(([nome, saidas]) => ({ nome, saidas }))
      .filter((r) => r.saidas > 0)
      .sort((a, b) => b.saidas - a.saidas)
      .slice(0, 12)
    const total = sorted.reduce((acc, r) => acc + r.saidas, 0)
    let acc = 0
    return sorted.map((r) => {
      acc += r.saidas
      return {
        nome: r.nome.length > 20 ? `${r.nome.slice(0, 18)}…` : r.nome,
        saidas: r.saidas,
        acumulado: total > 0 ? Math.round((acc / total) * 100) : 0,
      }
    })
  }, [data])

  if (points.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        Sem saídas em centros de custo.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart
        data={points}
        margin={{ top: 8, right: 16, left: 0, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="nome"
          interval={0}
          angle={-30}
          textAnchor="end"
          height={70}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={compactBRL}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          width={70}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          domain={[0, 100]}
          width={40}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === 'Acumulado' ? `${value}%` : formatBRL(value),
            name,
          ]}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="left"
          dataKey="saidas"
          name="Saídas"
          fill={CHART_COLORS.primaryDeep}
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="acumulado"
          name="Acumulado"
          stroke={CHART_COLORS.negative}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
