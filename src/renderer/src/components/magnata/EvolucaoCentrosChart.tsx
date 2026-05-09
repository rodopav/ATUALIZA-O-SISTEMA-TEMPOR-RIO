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
import { CHART_PALETTE } from '../../lib/chart-colors'
import type { Tables } from '../../../../shared/database.types'

type Row = Tables<'v_dashboard_centro_custo'>

interface EvolucaoCentrosChartProps {
  data: Row[]
  topN?: number
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
  if (!Number.isFinite(y) || !Number.isFinite(m)) return periodo ?? ''
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

export function EvolucaoCentrosChart({
  data,
  topN = 5,
}: EvolucaoCentrosChartProps): React.ReactElement {
  const { rows, ccTopN } = React.useMemo(() => {
    if (data.length === 0) return { rows: [], ccTopN: [] as string[] }
    // Identifica top N centros pelas saídas totais.
    const totals = new Map<string, number>()
    for (const r of data) {
      const nome = r.centro_custo ?? r.codigo ?? '—'
      totals.set(
        nome,
        (totals.get(nome) ?? 0) + Math.abs(Number(r.saidas ?? 0)),
      )
    }
    const ccTopN = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([nome]) => nome)

    // Constrói pivot: { periodo, [cc]: saidas }
    const periodoMap = new Map<string, Record<string, number | string>>()
    for (const r of data) {
      const periodo = r.periodo ?? ''
      const nome = r.centro_custo ?? r.codigo ?? '—'
      if (!ccTopN.includes(nome)) continue
      const cur = periodoMap.get(periodo) ?? {
        periodo,
        label: shortMonth(periodo),
      }
      cur[nome] =
        (Number(cur[nome] ?? 0) || 0) + Math.abs(Number(r.saidas ?? 0))
      periodoMap.set(periodo, cur)
    }
    const sorted = Array.from(periodoMap.values()).sort((a, b) =>
      String(a.periodo).localeCompare(String(b.periodo)),
    )
    return { rows: sorted, ccTopN }
  }, [data, topN])

  if (rows.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem evolução suficiente para exibir.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={rows}
        margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
      >
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
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {ccTopN.map((cc, i) => (
          <Line
            key={cc}
            type="monotone"
            dataKey={cc}
            stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
            strokeWidth={2}
            dot={false}
            name={cc.length > 16 ? `${cc.slice(0, 14)}…` : cc}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
