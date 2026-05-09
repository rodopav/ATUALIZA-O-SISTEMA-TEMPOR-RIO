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
import type { ContaSaldoRow } from '../../lib/magnata-queries'

interface BancoConcentracaoChartProps {
  contas: ContaSaldoRow[]
}

interface BancoBucket {
  banco: string
  saldo: number
  qtd: number
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

/**
 * Extrai o nome do banco a partir do apelido. Heurística:
 * - se a coluna `banco` veio preenchida, usa direto;
 * - senão, pega o primeiro token do apelido (ex.: "Bradesco PJ 1234").
 */
function bancoOfConta(c: ContaSaldoRow): string {
  if (c.banco && c.banco.trim().length > 0) return c.banco.trim()
  const apelido = c.apelido ?? ''
  const first = apelido.split(/[\s\-/—–]/).find((t) => t.length > 0)
  return first ?? '—'
}

export function BancoConcentracaoChart({
  contas,
}: BancoConcentracaoChartProps): React.ReactElement {
  const data = React.useMemo<BancoBucket[]>(() => {
    const map = new Map<string, BancoBucket>()
    for (const c of contas) {
      const banco = bancoOfConta(c)
      const saldo = Number(c.saldo_atual ?? 0)
      const cur = map.get(banco) ?? { banco, saldo: 0, qtd: 0 }
      cur.saldo += saldo
      cur.qtd += 1
      map.set(banco, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.saldo - a.saldo)
  }, [contas])

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma conta cadastrada.
      </div>
    )
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(data.length * 40, 220)}
    >
      <BarChart
        data={data}
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
          dataKey="banco"
          type="category"
          tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
          width={120}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number, _n, payload) => [
            formatBRL(value),
            `${payload.payload?.qtd ?? 0} conta(s)`,
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
          barSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
