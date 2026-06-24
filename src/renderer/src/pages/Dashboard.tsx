import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Building2,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { KpiCard } from '../components/dashboards/KpiCard'
import { SaldoEmpresaChart } from '../components/dashboards/SaldoEmpresaChart'
import { RecentLancamentos } from '../components/dashboards/RecentLancamentos'
import { SaldosConsolidadosCards } from '../components/dashboards/SaldosConsolidadosCards'
import { LimitesPorContaSection } from '../components/dashboards/LimitesPorContaSection'
import { ContasClassificadasSection } from '../components/dashboards/ContasClassificadasSection'
import { EmpresaMultiSelect } from '../components/EmpresaMultiSelect'
import {
  saldoGeralQuery,
  empresasQuery,
  currentPeriodoIso,
} from '../lib/queries'
import { saldoGeralIntervaloQuery } from '../lib/dashboards-queries'
import { lancamentosListQuery } from '../lib/lancamentos-queries'
import { formatBRL } from '../lib/format'
import { mapError } from '../lib/error-mapper'
import { useAuthStore } from '../lib/auth-store'
import { usePageFilters } from '../lib/filters-store'
import {
  PeriodoFilter,
  defaultPeriodoValue,
  formatPeriodoFilter,
  periodoBounds,
  type PeriodoFilterValue,
} from '../components/filters/PeriodoFilter'

interface DashboardFilters {
  periodo: PeriodoFilterValue
  empresaIds: string[]
}

function firstName(full: string | null | undefined): string {
  if (!full) return 'Bem-vindo'
  return full.trim().split(/\s+/)[0] ?? 'Bem-vindo'
}

function greetingFor(date: Date): string {
  const h = date.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function subtractDayIso(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-').map((s) => Number.parseInt(s, 10))
  const prev = new Date(y!, m! - 1, (d ?? 1) - 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
}

export function DashboardPage(): React.ReactElement {
  const profile = useAuthStore((s) => s.profile)

  const defaultFilters = React.useMemo<DashboardFilters>(
    () => ({
      periodo: defaultPeriodoValue(currentPeriodoIso()),
      empresaIds: [],
    }),
    [],
  )
  const f = usePageFilters<DashboardFilters>('dashboard', defaultFilters)
  const { periodo, empresaIds } = f.value

  const setPeriodo = React.useCallback(
    (next: PeriodoFilterValue) => f.set({ periodo: next }),
    [f],
  )
  const setEmpresaIds = React.useCallback(
    (next: string[]) => f.set({ empresaIds: next }),
    [f],
  )

  const empresasQ = useQuery(empresasQuery)

  const isIntervalo = periodo.mode === 'intervalo'
  const bounds = periodoBounds(periodo)
  const rangeReady =
    isIntervalo && bounds && periodo.dataInicio && periodo.dataFim
      ? { dataInicio: bounds.start, dataFim: subtractDayIso(bounds.endExclusive) }
      : null

  // Modo Mês: usa a saldoGeralQuery (já refatorada pra rotear pra RPC
  // internamente, então corrige o bug do JOIN na view v_saldo_geral).
  const mesSaldoQ = useQuery({
    ...saldoGeralQuery({
      periodo: periodo.mesIso,
      empresaIds: empresaIds.length > 0 ? empresaIds : undefined,
    }),
    enabled: !isIntervalo,
  })

  // Modo Intervalo: chama a RPC direto.
  const intSaldoQ = useQuery({
    ...saldoGeralIntervaloQuery(
      rangeReady ?? { dataInicio: '', dataFim: '' },
      {
        empresaIds: empresaIds.length > 0 ? empresaIds : undefined,
      },
    ),
    enabled: Boolean(rangeReady),
  })

  const saldoQ = isIntervalo ? intSaldoQ : mesSaldoQ

  // Lançamentos recentes: usa o mesmo período pra coerência.
  const recentQ = useQuery(
    lancamentosListQuery({
      // Sempre passamos bounds (start/end) — funciona pros dois modos
      // e ignora o mês cadastrado no DB (que é apenas first-day-of-month).
      dataInicio: bounds?.start ?? null,
      dataFim: bounds ? subtractDayIso(bounds.endExclusive) : null,
      natureza: null,
      centroCustoId: null,
      empresaId: empresaIds.length === 1 ? empresaIds[0] : null,
      search: null,
    }),
  )

  const totals = React.useMemo(() => {
    const data = saldoQ.data ?? []
    const totalSaldo = data.reduce((acc, r) => acc + (r.saldo_atual ?? 0), 0)
    const entradas = data.reduce((acc, r) => acc + (r.entradas ?? 0), 0)
    const saidas = data.reduce((acc, r) => acc + (r.saidas ?? 0), 0)
    const divergentes = data.filter((r) => r.status === 'DIVERGENTE').length
    return { totalSaldo, entradas, saidas, divergentes }
  }, [saldoQ.data])

  const errorMsg = saldoQ.error
    ? mapError(saldoQ.error).description
    : recentQ.error
      ? mapError(recentQ.error).description
      : null

  const greeting = `${greetingFor(new Date())}, ${firstName(profile?.nome_completo)}.`
  const recentTop5 = (recentQ.data ?? []).slice(0, 5)
  const periodoLabel = formatPeriodoFilter(periodo)
  const hasActiveFilters =
    periodo.mode === 'intervalo' || empresaIds.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={periodoLabel.toUpperCase()}
        title={greeting}
        description={`Visão geral das contas — ${periodoLabel}${empresaIds.length > 0 ? ` • ${empresaIds.length} empresa(s) filtrada(s)` : ''}.`}
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <PeriodoFilter value={periodo} onChange={setPeriodo} />
            <EmpresaMultiSelect
              empresas={empresasQ.data ?? []}
              value={empresaIds}
              onChange={setEmpresaIds}
              loading={empresasQ.isLoading}
            />
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={f.reset}
                className="h-10"
              >
                <XCircle className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            ) : (
              <div className="h-10" />
            )}
          </div>
        </CardContent>
      </Card>

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <SaldosConsolidadosCards />

      <ContasClassificadasSection kind="caixa_fisico" />
      <ContasClassificadasSection kind="investimento" />

      <LimitesPorContaSection />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Saldo total das contas"
          icon={<Wallet />}
          loading={saldoQ.isLoading}
          value={formatBRL(totals.totalSaldo)}
          hint="Soma do saldo atual de todas as contas no filtro."
        />
        <KpiCard
          label="Entradas do período"
          icon={<ArrowUpRight />}
          tone="success"
          loading={saldoQ.isLoading}
          value={formatBRL(totals.entradas)}
          hint="Total creditado (não-transferências)."
        />
        <KpiCard
          label="Saídas do período"
          icon={<ArrowDownRight />}
          tone="destructive"
          loading={saldoQ.isLoading}
          value={formatBRL(totals.saidas)}
          hint="Total debitado (não-transferências)."
        />
        <KpiCard
          label="Contas divergentes"
          icon={
            totals.divergentes > 0 ? <AlertTriangle /> : <CheckCircle2 />
          }
          tone={totals.divergentes > 0 ? 'destructive' : 'success'}
          loading={saldoQ.isLoading}
          value={
            totals.divergentes > 0
              ? String(totals.divergentes).padStart(2, '0')
              : 'Tudo conferido'
          }
          hint={
            totals.divergentes > 0 ? (
              <Link
                to="/dashboard/saldo-geral?status=DIVERGENTE"
                className="inline-flex items-center gap-1 font-medium text-destructive hover:underline"
              >
                Ver divergências
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              'Todas as contas estão conferidas no filtro.'
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Saldo por empresa</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Saldo atual consolidado por entidade legal.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {saldoQ.isLoading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : (
              <SaldoEmpresaChart data={saldoQ.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Últimos lançamentos</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Atividade recente do período.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/lancamentos">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <RecentLancamentos
              data={recentTop5}
              loading={recentQ.isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
