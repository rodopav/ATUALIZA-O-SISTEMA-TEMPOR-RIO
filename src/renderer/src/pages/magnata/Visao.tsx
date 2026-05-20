import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../components/ui/alert'
import { Skeleton } from '../../components/ui/skeleton'
import { AlertasBanner } from '../../components/magnata/AlertasBanner'
import { MagnataKpiGrid } from '../../components/magnata/MagnataKpiGrid'
import { EvolucaoSaldoChart } from '../../components/magnata/EvolucaoSaldoChart'
import { TipoContaPieChart } from '../../components/magnata/TipoContaPieChart'
import { SaldosConsolidadosCards } from '../../components/dashboards/SaldosConsolidadosCards'
import { LimitesPorContaSection } from '../../components/dashboards/LimitesPorContaSection'
import {
  alertasQuery,
  contasSaldoMagnataQuery,
  fluxoDiarioQuery,
  fluxoMensalQuery,
  kpisQuery,
} from '../../lib/magnata-queries'
import { mapError } from '../../lib/error-mapper'

export function MagnataVisaoPage(): React.ReactElement {
  const kpisQ = useQuery(kpisQuery)
  const alertasQ = useQuery(alertasQuery)
  const fluxoDiarioQ = useQuery(fluxoDiarioQuery)
  const fluxoMensalQ = useQuery(fluxoMensalQuery)
  const contasQ = useQuery(contasSaldoMagnataQuery)

  const errorMsg =
    kpisQ.error ?? alertasQ.error ?? fluxoMensalQ.error ?? contasQ.error
  const errorDescription = errorMsg ? mapError(errorMsg).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Visão Executiva"
        description="Indicadores estratégicos consolidados do grupo Rodopav."
      />

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar dados</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      {alertasQ.data && alertasQ.data.length > 0 ? (
        <AlertasBanner alertas={alertasQ.data} />
      ) : null}

      {/* Mesmos cards que o app financeiro: Contas / Caixa físico /
          Saldo Geral / Limite disponível. Frank: "quero que todas as
          informações estejam no Magnata também". */}
      <SaldosConsolidadosCards />

      <LimitesPorContaSection />

      <MagnataKpiGrid
        kpis={kpisQ.data}
        fluxoDiario={fluxoDiarioQ.data ?? []}
        loading={kpisQ.isLoading || fluxoDiarioQ.isLoading}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Evolução do Saldo (12 meses)</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Saldo cumulativo derivado do fluxo mensal líquido.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {fluxoMensalQ.isLoading || kpisQ.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <EvolucaoSaldoChart
                data={fluxoMensalQ.data ?? []}
                saldoAtual={kpisQ.data?.saldo_total ?? 0}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Conta</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Saldo atual segmentado por natureza da conta.
            </p>
          </CardHeader>
          <CardContent>
            {contasQ.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <TipoContaPieChart contas={contasQ.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MagnataVisaoPage
