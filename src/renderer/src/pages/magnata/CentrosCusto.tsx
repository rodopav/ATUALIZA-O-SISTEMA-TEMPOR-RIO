import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { PieChart, AlertTriangle } from 'lucide-react'
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
import { TopCentrosChart } from '../../components/magnata/TopCentrosChart'
import { EvolucaoCentrosChart } from '../../components/magnata/EvolucaoCentrosChart'
import { OutliersList } from '../../components/magnata/OutliersList'
import { centrosCustoDashboardQuery } from '../../lib/dashboards-queries'
import { mapError } from '../../lib/error-mapper'
import { currentPeriodoIso } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import { queryOptions } from '@tanstack/react-query'
import type { Tables } from '../../../../shared/database.types'

type Row = Tables<'v_dashboard_centro_custo'>

const allPeriodosCcQuery = queryOptions({
  queryKey: ['magnata', 'cc_all'] as const,
  queryFn: async (): Promise<Row[]> => {
    const { data, error } = await supabase
      .from('v_dashboard_centro_custo')
      .select('*')
      .order('periodo', { ascending: true })
    if (error) throw error
    return data ?? []
  },
  staleTime: 60_000,
})

export function MagnataCentrosCustoPage(): React.ReactElement {
  const periodo = React.useMemo(() => currentPeriodoIso(), [])
  const ccMesQ = useQuery(centrosCustoDashboardQuery(periodo))
  const ccAllQ = useQuery(allPeriodosCcQuery)

  const errorMsg = ccMesQ.error ?? ccAllQ.error
  const errorDescription = errorMsg ? mapError(errorMsg).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Centros de Custo"
        description="Distribuição, evolução e outliers de gasto por centro."
      />

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar centros de custo</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Top 15 — Mês Corrente</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Centros com maior volume de saídas no mês.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
            <PieChart className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {ccMesQ.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <TopCentrosChart data={ccMesQ.data ?? []} limit={15} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução das 5 maiores categorias</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Saídas mensais dos centros mais relevantes.
            </p>
          </CardHeader>
          <CardContent>
            {ccAllQ.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <EvolucaoCentrosChart data={ccAllQ.data ?? []} topN={5} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outliers de gasto</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Centros com z-score &gt; 3 em relação ao histórico.
            </p>
          </CardHeader>
          <CardContent>
            {ccAllQ.isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <OutliersList data={ccAllQ.data ?? []} threshold={3} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MagnataCentrosCustoPage
