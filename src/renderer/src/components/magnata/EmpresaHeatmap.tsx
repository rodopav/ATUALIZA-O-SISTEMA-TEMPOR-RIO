import * as React from 'react'
import { formatBRL } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Tables } from '../../../../shared/database.types'
import type { SaldoPorEmpresaRow } from '../../lib/magnata-queries'

type SaldoGeralRow = Tables<'v_saldo_geral'>

interface EmpresaHeatmapProps {
  empresas: SaldoPorEmpresaRow[]
  saldoGeral: SaldoGeralRow[]
}

interface Cell {
  empresa: string
  empresaId: string
  periodo: string
  liquido: number
}

function shortMonth(periodo: string): string {
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

function colorFor(liquido: number, max: number): string {
  if (max === 0) return 'bg-muted'
  const ratio = liquido / max
  if (liquido >= 0) {
    if (ratio > 0.66) return 'bg-success/60 text-success-foreground'
    if (ratio > 0.33) return 'bg-success/35 text-foreground'
    if (ratio > 0) return 'bg-success/15 text-foreground'
    return 'bg-muted text-muted-foreground'
  }
  const negRatio = Math.abs(liquido) / max
  if (negRatio > 0.66) return 'bg-destructive/60 text-destructive-foreground'
  if (negRatio > 0.33) return 'bg-destructive/35 text-foreground'
  return 'bg-destructive/15 text-foreground'
}

export function EmpresaHeatmap({
  empresas,
  saldoGeral,
}: EmpresaHeatmapProps): React.ReactElement {
  const periodos = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of saldoGeral) {
      if (r.periodo) set.add(r.periodo)
    }
    return Array.from(set).sort().slice(-12)
  }, [saldoGeral])

  const cells = React.useMemo<Cell[]>(() => {
    const out: Cell[] = []
    for (const emp of empresas) {
      if (!emp.empresa_id) continue
      const empresaLabel =
        emp.nome_fantasia ?? emp.razao_social ?? emp.empresa_id.slice(0, 8)
      for (const p of periodos) {
        const rows = saldoGeral.filter(
          (r) => r.empresa_id === emp.empresa_id && r.periodo === p,
        )
        const liquido = rows.reduce(
          (acc, r) =>
            acc + Number(r.entradas ?? 0) - Number(r.saidas ?? 0),
          0,
        )
        out.push({
          empresa: empresaLabel,
          empresaId: emp.empresa_id,
          periodo: p,
          liquido,
        })
      }
    }
    return out
  }, [empresas, saldoGeral, periodos])

  const maxAbs = React.useMemo(
    () => cells.reduce((acc, c) => Math.max(acc, Math.abs(c.liquido)), 0),
    [cells],
  )

  if (cells.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Sem dados de fluxo por empresa.
      </div>
    )
  }

  const empresasUnique = Array.from(new Set(empresas.map((e) => e.empresa_id)))
    .filter((id): id is string => Boolean(id))
    .map((id) => {
      const emp = empresas.find((e) => e.empresa_id === id)
      return {
        id,
        label: emp?.nome_fantasia ?? emp?.razao_social ?? id.slice(0, 8),
      }
    })

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-background py-1 pr-2 text-left font-medium text-muted-foreground">
              Empresa
            </th>
            {periodos.map((p) => (
              <th
                key={p}
                className="px-1 py-1 text-center font-medium text-muted-foreground"
              >
                {shortMonth(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empresasUnique.map((emp) => (
            <tr key={emp.id}>
              <td className="sticky left-0 bg-background py-1 pr-2 text-left font-medium">
                {emp.label}
              </td>
              {periodos.map((p) => {
                const cell = cells.find(
                  (c) => c.empresaId === emp.id && c.periodo === p,
                )
                const liquido = cell?.liquido ?? 0
                return (
                  <td
                    key={p}
                    title={`${shortMonth(p)} · ${formatBRL(liquido)}`}
                    className={cn(
                      'h-8 min-w-[44px] rounded text-center text-[10px] font-semibold tabular-nums',
                      colorFor(liquido, maxAbs),
                    )}
                  >
                    {liquido !== 0
                      ? `${liquido > 0 ? '+' : '-'}${Math.round(
                          Math.abs(liquido) / 1000,
                        )}k`
                      : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
