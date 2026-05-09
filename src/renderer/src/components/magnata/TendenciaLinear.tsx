import * as React from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { FluxoMensalRow } from '../../lib/magnata-queries'

interface TendenciaLinearProps {
  data: FluxoMensalRow[]
}

interface Point {
  label: string
  entradas: number
  saidas: number
  trendIn: number
  trendOut: number
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

interface Coef {
  a: number
  b: number
}

function linRegression(values: number[]): Coef {
  const n = values.length
  if (n === 0) return { a: 0, b: 0 }
  const xs = values.map((_, i) => i)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = values.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce(
    (acc, x, i) => acc + (x - meanX) * ((values[i] ?? 0) - meanY),
    0,
  )
  const den = xs.reduce((acc, x) => acc + Math.pow(x - meanX, 2), 0)
  const a = den === 0 ? 0 : num / den
  const b = meanY - a * meanX
  return { a, b }
}

export function TendenciaLinear({
  data,
}: TendenciaLinearProps): React.ReactElement {
  const points = React.useMemo<Point[]>(() => {
    if (data.length === 0) return []
    const sorted = [...data]
      .sort((a, b) => (a.periodo ?? '').localeCompare(b.periodo ?? ''))
      .slice(-12)
    const entradas = sorted.map((r) => Number(r.entradas ?? 0))
    const saidas = sorted.map((r) => Number(r.saidas ?? 0))
    const fitIn = linRegression(entradas)
    const fitOut = linRegression(saidas)
    return sorted.map((r, i) => ({
      label: shortMonth(r.periodo),
      entradas: entradas[i] ?? 0,
      saidas: saidas[i] ?? 0,
      trendIn: fitIn.a * i + fitIn.b,
      trendOut: fitOut.a * i + fitOut.b,
    }))
  }, [data])

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem dados de tendência.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          tickFormatter={compactBRL}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          width={70}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatBRL(value), name]}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="entradas"
          name="Entradas"
          stroke={CHART_COLORS.positive}
          strokeWidth={2}
          dot={{ r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="trendIn"
          name="Tendência entradas"
          stroke={CHART_COLORS.positive}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="saidas"
          name="Saídas"
          stroke={CHART_COLORS.negative}
          strokeWidth={2}
          dot={{ r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="trendOut"
          name="Tendência saídas"
          stroke={CHART_COLORS.negative}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
