import * as React from 'react'
import {
  Wallet,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Activity,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { cn } from '../../lib/cn'
import { formatBRL } from '../../lib/format'
import type {
  FluxoDiarioRow,
  MagnataKpis,
} from '../../lib/magnata-queries'
import { KpiSparkline, type SparklinePoint } from './KpiSparkline'
import { RunwayGauge } from './RunwayGauge'

interface MagnataKpiGridProps {
  kpis: MagnataKpis | undefined
  fluxoDiario: FluxoDiarioRow[]
  loading: boolean
}

function buildSparkline(
  fluxoDiario: FluxoDiarioRow[],
  saldoFinal: number,
): SparklinePoint[] {
  if (fluxoDiario.length === 0) return []
  const last30 = fluxoDiario.slice(-30)
  let acc = saldoFinal
  const reversed = [...last30].reverse().map((d) => {
    const liquidoDia =
      Number(d.entradas ?? 0) - Number(d.saidas ?? 0)
    const beforeDay = acc - liquidoDia
    const point = { data: d.data ?? '', saldo: acc }
    acc = beforeDay
    return point
  })
  return reversed.reverse()
}

export function MagnataKpiGrid({
  kpis,
  fluxoDiario,
  loading,
}: MagnataKpiGridProps): React.ReactElement {
  const sparkline = React.useMemo(
    () => (kpis ? buildSparkline(fluxoDiario, kpis.saldo_total) : []),
    [fluxoDiario, kpis],
  )

  const taxaConciliacao = kpis
    ? Math.round(kpis.taxa_conciliacao * 100) / 100
    : 0
  const runwayDias = kpis?.runway_dias ?? null
  const resultado = kpis?.resultado_operacional ?? 0
  const resultadoPositivo = resultado >= 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label="Saldo Total Consolidado"
        icon={<Wallet />}
        loading={loading}
        value={formatBRL(kpis?.saldo_total ?? 0)}
        accent="amber"
      >
        {sparkline.length > 1 ? (
          <KpiSparkline data={sparkline} positive={resultadoPositivo} />
        ) : null}
      </KpiCard>

      <KpiCard
        label="Resultado Operacional do Mês"
        icon={<TrendingUp />}
        loading={loading}
        value={
          <span
            className={cn(
              'inline-flex items-center gap-1',
              resultadoPositivo ? 'text-success' : 'text-destructive',
            )}
          >
            {resultadoPositivo ? '↑' : '↓'} {formatBRL(Math.abs(resultado))}
          </span>
        }
        accent={resultadoPositivo ? 'success' : 'destructive'}
      />

      <KpiCard
        label="Runway de Caixa"
        icon={<Calendar />}
        loading={loading}
        value={
          runwayDias === null
            ? '—'
            : `${Math.max(0, Math.round(runwayDias))} dias`
        }
        accent="amber"
      >
        {runwayDias !== null ? <RunwayGauge dias={runwayDias} /> : null}
      </KpiCard>

      <KpiCard
        label="Taxa de Conciliação"
        icon={<CheckCircle2 />}
        loading={loading}
        value={`${taxaConciliacao.toFixed(1)}%`}
        accent="success"
      >
        <ProgressBar value={taxaConciliacao} />
      </KpiCard>

      <KpiCard
        label="Volume Movimentado (mês)"
        icon={<Activity />}
        loading={loading}
        value={formatBRL(kpis?.volume_mes ?? 0)}
        accent="amber"
      />

      <KpiCard
        label="Solicitações Pendentes"
        icon={<Clock />}
        loading={loading}
        value={
          <div className="space-y-0.5">
            <p className="text-3xl font-semibold tabular-nums">
              {kpis?.solicitacoes_pendentes_count ?? 0}
            </p>
            <p className="text-xs font-normal text-muted-foreground">
              {formatBRL(kpis?.solicitacoes_pendentes_valor ?? 0)} em valor
            </p>
          </div>
        }
        accent="warning"
        rawValue
      />
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  loading: boolean
  children?: React.ReactNode
  accent: 'amber' | 'success' | 'destructive' | 'warning'
  rawValue?: boolean
}

const ACCENT_STYLES: Record<KpiCardProps['accent'], string> = {
  amber: 'bg-amb-400/10 text-amb-500 dark:text-amb-300',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/15 text-warning-foreground dark:text-warning',
}

function KpiCard({
  label,
  value,
  icon,
  loading,
  children,
  accent,
  rawValue,
}: KpiCardProps): React.ReactElement {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4',
              ACCENT_STYLES[accent],
            )}
          >
            {icon}
          </div>
        </div>
        <div className="mt-4 min-h-[40px]">
          {loading ? (
            <Skeleton className="h-9 w-32" />
          ) : rawValue ? (
            value
          ) : (
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
          )}
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value }: { value: number }): React.ReactElement {
  const pct = Math.max(0, Math.min(100, value))
  const color =
    pct >= 90 ? 'bg-success' : pct >= 70 ? 'bg-amb-400' : 'bg-destructive'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full transition-all', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
