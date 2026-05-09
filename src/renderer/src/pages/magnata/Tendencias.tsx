import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, AlertTriangle } from 'lucide-react'
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
import { ProjecaoChart } from '../../components/magnata/ProjecaoChart'
import { TendenciaLinear } from '../../components/magnata/TendenciaLinear'
import { BurnRateChart } from '../../components/magnata/BurnRateChart'
import { EmpresaHeatmap } from '../../components/magnata/EmpresaHeatmap'
import {
  fluxoDiarioQuery,
  fluxoMensalQuery,
  projecaoQuery,
  saldoPorEmpresaQuery,
} from '../../lib/magnata-queries'
import { saldoGeralQuery } from '../../lib/queries'
import { mapError } from '../../lib/error-mapper'

export function MagnataTendenciasPage(): React.ReactElement {
  const projQ = useQuery(projecaoQuery({ dias: 30 }))
  const fluxoMQ = useQuery(fluxoMensalQuery)
  const fluxoDQ = useQuery(fluxoDiarioQuery)
  const empresasQ = useQuery(saldoPorEmpresaQuery)
  const saldoGeralQ = useQuery(saldoGeralQuery({}))

  const errorMsg =
    projQ.error ?? fluxoMQ.error ?? fluxoDQ.error ?? empresasQ.error
  const errorDescription = errorMsg ? mapError(errorMsg).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Tendências"
        description="Projeções, regressão linear e variação por empresa."
      />

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar tendências</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Projeção de Saldo (30 dias)</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Banda de confiança baseada na volatilidade histórica.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
            <Sparkles className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {projQ.isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <ProjecaoChart data={projQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendência linear (12 meses)</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Regressão linear de entradas e saídas.
            </p>
          </CardHeader>
          <CardContent>
            {fluxoMQ.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <TendenciaLinear data={fluxoMQ.data ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Burn Rate</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Saídas diárias com média móvel de 7 dias.
            </p>
          </CardHeader>
          <CardContent>
            {fluxoDQ.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <BurnRateChart data={fluxoDQ.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variação MoM por empresa</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Heatmap mensal do fluxo líquido por empresa.
          </p>
        </CardHeader>
        <CardContent>
          {empresasQ.isLoading || saldoGeralQ.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <EmpresaHeatmap
              empresas={empresasQ.data ?? []}
              saldoGeral={saldoGeralQ.data ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MagnataTendenciasPage
