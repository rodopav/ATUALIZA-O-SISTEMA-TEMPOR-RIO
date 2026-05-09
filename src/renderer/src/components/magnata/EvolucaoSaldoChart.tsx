import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { FluxoMensalRow } from '../../lib/magnata-queries'

interface EvolucaoSaldoChartProps {
  data: FluxoMensalRow[]
  saldoAtual: number
}

interface Point {
  periodo: string
  label: string
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

function shortMonth(periodo: string): string {
  // periodo é YYYY-MM-DD do primeiro dia do mês.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodo)) return periodo
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

export function EvolucaoSaldoChart({
  data,
  saldoAtual,
}: EvolucaoSaldoChartProps): React.ReactElement {
  const points = React.useMemo<Point[]>(() => {
    if (data.length === 0) return []
    // Ordena por periodo asc.
    const sorted = [...data].sort((a, b) =>
      (a.periodo ?? '').localeCompare(b.periodo ?? ''),
    )
    // Pega últimos 12.
    const last12 = sorted.slice(-12)
    // Soma cumulativa retroativa a partir do saldoAtual.
    let acc = saldoAtual
    const reversed = [...last12].reverse().map((r) => {
      const liquido = Number(r.liquido ?? 0)
      const before = acc - liquido
      const point: Point = {
        periodo: r.periodo ?? '',
        label: shortMonth(r.periodo ?? ''),
        saldo: acc,
      }
      acc = before
      return point
    })
    return reversed.reverse()
  }, [data, saldoAtual])

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem dados de fluxo para os últimos meses.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={points}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
        <defs>
          <linearGradient id="evolSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primaryDeep} stopOpacity={0.5} />
            <stop offset="95%" stopColor={CHART_COLORS.primaryDeep} stopOpacity={0.05} />
          </linearGradient>
        </defs>
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
          formatter={(value: number) => [formatBRL(value), 'Saldo']}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            fontSize: 12,
            padding: '8px 12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke={CHART_COLORS.primaryDeep}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#evolSaldo)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
