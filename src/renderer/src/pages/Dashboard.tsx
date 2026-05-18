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
import {
  saldoGeralQuery,
  currentPeriodoIso,
} from '../lib/queries'
import { lancamentosListQuery } from '../lib/lancamentos-queries'
import { formatBRL, formatPeriodo } from '../lib/format'
import { mapError } from '../lib/error-mapper'
import { useAuthStore } from '../lib/auth-store'

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

export function DashboardPage(): React.ReactElement {
  const periodo = React.useMemo(() => currentPeriodoIso(), [])
  const profile = useAuthStore((s) => s.profile)

  const saldoQ = useQuery(saldoGeralQuery({ periodo }))
  const recentQ = useQuery(
    lancamentosListQuery({
      periodo,
      natureza: null,
      centroCustoId: null,
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatPeriodo(periodo)}
        title={greeting}
        description={`Visão geral das contas no mês de ${formatPeriodo(periodo)}.`}
      />

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <SaldosConsolidadosCards />

      <LimitesPorContaSection />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Saldo total das contas"
          icon={<Wallet />}
          loading={saldoQ.isLoading}
          value={formatBRL(totals.totalSaldo)}
          hint="Soma do saldo atual de todas as contas."
        />
        <KpiCard
          label="Entradas do mês"
          icon={<ArrowUpRight />}
          tone="success"
          loading={saldoQ.isLoading}
          value={formatBRL(totals.entradas)}
          hint="Total creditado em todas as contas."
        />
        <KpiCard
          label="Saídas do mês"
          icon={<ArrowDownRight />}
          tone="destructive"
          loading={saldoQ.isLoading}
          value={formatBRL(totals.saidas)}
          hint="Total debitado em todas as contas."
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
              'Todas as contas estão conferidas neste período.'
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
                Atividade recente do mês.
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
