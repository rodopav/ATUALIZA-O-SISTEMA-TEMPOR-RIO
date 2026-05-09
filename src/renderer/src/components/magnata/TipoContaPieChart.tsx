import * as React from 'react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { formatBRL } from '../../lib/format'
import { CHART_COLORS } from '../../lib/chart-colors'
import type { ContaSaldoRow } from '../../lib/magnata-queries'

interface TipoContaPieChartProps {
  contas: ContaSaldoRow[]
}

const TIPO_LABELS: Record<string, string> = {
  CORRENTE: 'Corrente',
  POUPANCA: 'Poupança',
  CAIXA_FISICO: 'Caixa Físico',
  CARTAO_CREDITO_CONTA: 'Cartão de Crédito',
}

/**
 * Sequência tonal âmbar para slices do pie. Mantém identidade brand
 * (Magnata gold) variando intensidade entre fatias adjacentes.
 */
const COLORS = [
  CHART_COLORS.primaryDeep,
  CHART_COLORS.primary,
  CHART_COLORS.primaryAccent,
  'hsl(var(--amb-600))',
] as const

interface SliceData {
  tipo: string
  label: string
  total: number
}

export function TipoContaPieChart({
  contas,
}: TipoContaPieChartProps): React.ReactElement {
  const data = React.useMemo<SliceData[]>(() => {
    const map = new Map<string, number>()
    for (const c of contas) {
      const key = c.tipo ?? 'OUTRO'
      const v = Number(c.saldo_atual ?? 0)
      // Apenas saldos positivos contam para a distribuição (saldos negativos
      // distorceriam o pie).
      if (v <= 0) continue
      map.set(key, (map.get(key) ?? 0) + v)
    }
    return Array.from(map.entries())
      .map(([tipo, total]) => ({
        tipo,
        label: TIPO_LABELS[tipo] ?? tipo,
        total,
      }))
      .sort((a, b) => b.total - a.total)
  }, [contas])

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Sem contas com saldo positivo.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
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
        <Legend
          verticalAlign="bottom"
          height={32}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
