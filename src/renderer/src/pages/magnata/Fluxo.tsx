import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertTriangle } from 'lucide-react'
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
import { FluxoMensalChart } from '../../components/magnata/FluxoMensalChart'
import { TopFornecedoresChart } from '../../components/magnata/TopFornecedoresChart'
import { ParetoCentrosChart } from '../../components/magnata/ParetoCentrosChart'
import {
  fluxoMensalQuery,
  topFornecedoresQuery,
} from '../../lib/magnata-queries'
import { centrosCustoDashboardQuery } from '../../lib/dashboards-queries'
import { mapError } from '../../lib/error-mapper'
import { currentPeriodoIso } from '../../lib/queries'

export function MagnataFluxoPage(): React.ReactElement {
  const periodo = React.useMemo(() => currentPeriodoIso(), [])
  const fluxoQ = useQuery(fluxoMensalQuery)
  const topFornecedoresQ = useQuery(topFornecedoresQuery)
  const ccQ = useQuery(centrosCustoDashboardQuery(periodo))

  const errorMsg =
    fluxoQ.error ?? topFornecedoresQ.error ?? ccQ.error
  const errorDescription = errorMsg ? mapError(errorMsg).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Fluxo de Caixa"
        description="Entradas e saídas operacionais com análise de concentração."
      />

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar fluxo</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Entradas vs Saídas (12 meses)</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Volume mensal de movimentos operacionais.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {fluxoQ.isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <FluxoMensalChart data={fluxoQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Fornecedores</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Saídas acumuladas por fornecedor.
            </p>
          </CardHeader>
          <CardContent>
            {topFornecedoresQ.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <TopFornecedoresChart data={topFornecedoresQ.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pareto 80/20 — Centros de Custo</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Saídas do mês corrente acumuladas por centro de custo.
            </p>
          </CardHeader>
          <CardContent>
            {ccQ.isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <ParetoCentrosChart data={ccQ.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MagnataFluxoPage
