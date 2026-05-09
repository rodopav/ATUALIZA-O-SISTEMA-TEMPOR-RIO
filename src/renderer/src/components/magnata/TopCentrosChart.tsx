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
import type { Tables } from '../../../../shared/database.types'

type Row = Tables<'v_dashboard_centro_custo'>

interface TopCentrosChartProps {
  data: Row[]
  limit?: number
}

interface Point {
  nome: string
  saidas: number
  entradas: number
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

export function TopCentrosChart({
  data,
  limit = 15,
}: TopCentrosChartProps): React.ReactElement {
  const points = React.useMemo<Point[]>(() => {
    if (data.length === 0) return []
    const map = new Map<string, Point>()
    for (const r of data) {
      const nome = r.centro_custo ?? r.codigo ?? '—'
      const cur = map.get(nome) ?? { nome, saidas: 0, entradas: 0 }
      cur.saidas += Math.abs(Number(r.saidas ?? 0))
      cur.entradas += Number(r.entradas ?? 0)
      map.set(nome, cur)
    }
    return Array.from(map.values())
      .filter((p) => p.saidas > 0 || p.entradas > 0)
      .sort((a, b) => b.saidas + b.entradas - (a.saidas + a.entradas))
      .slice(0, limit)
      .map((p) => ({
        ...p,
        nome: p.nome.length > 22 ? `${p.nome.slice(0, 20)}…` : p.nome,
      }))
  }, [data, limit])

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem dados de centros de custo no período.
      </div>
    )
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(points.length * 32, 240)}
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
        />
        <YAxis
          dataKey="nome"
          type="category"
          tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
          width={170}
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
          }}
        />
        <Bar
          dataKey="saidas"
          name="Saídas"
          fill="hsl(var(--destructive))"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
