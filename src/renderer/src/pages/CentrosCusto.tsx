import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ListChecks,
  Wallet,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { StatCard } from '../components/dashboards/StatCard'
import { CentrosCustoChart } from '../components/dashboards/CentrosCustoChart'
import { CentrosCustoPie } from '../components/dashboards/CentrosCustoPie'
import { CentrosCustoTable } from '../components/dashboards/CentrosCustoTable'
import {
  centrosCustoDashboardQuery,
  centrosCustoIntervaloQuery,
} from '../lib/dashboards-queries'
import { currentPeriodoIso } from '../lib/queries'
import {
  PeriodoFilter,
  defaultPeriodoValue,
  formatPeriodoFilter,
  periodoBounds,
  type PeriodoFilterValue,
} from '../components/filters/PeriodoFilter'
import { formatBRL } from '../lib/format'
import { mapError } from '../lib/error-mapper'
import { usePageFilters } from '../lib/filters-store'

interface CentrosCustoFilters {
  periodo: PeriodoFilterValue
}

const defaultCentrosCustoFilters: CentrosCustoFilters = {
  periodo: defaultPeriodoValue(currentPeriodoIso()),
}

export default function CentrosCustoPage(): React.ReactElement {
  const f = usePageFilters('centros_custo', defaultCentrosCustoFilters)
  const { periodo } = f.value

  const setPeriodo = React.useCallback(
    (next: PeriodoFilterValue) => f.set({ periodo: next }),
    [f],
  )

  const isIntervalo = periodo.mode === 'intervalo'
  const bounds = periodoBounds(periodo)
  const rangeReady =
    isIntervalo && bounds && periodo.dataInicio && periodo.dataFim
      ? { dataInicio: bounds.start, dataFim: subtractDay(bounds.endExclusive) }
      : null

  const mesQ = useQuery({
    ...centrosCustoDashboardQuery(periodo.mesIso),
    enabled: !isIntervalo,
  })
  const intQ = useQuery({
    ...centrosCustoIntervaloQuery(
      rangeReady ?? { dataInicio: '', dataFim: '' },
    ),
    enabled: Boolean(rangeReady),
  })

  const data = (isIntervalo ? intQ.data : mesQ.data) ?? []
  const isLoading = isIntervalo ? intQ.isLoading : mesQ.isLoading
  const queryError = isIntervalo ? intQ.error : mesQ.error

  const totals = React.useMemo(() => {
    return data.reduce(
      (acc, r) => {
        acc.entradas += Number(r.entradas ?? 0)
        acc.saidas += Number(r.saidas ?? 0)
        acc.saldo += Number(r.saldo_liquido ?? 0)
        acc.qtd += Number(r.qtd_lancamentos ?? 0)
        return acc
      },
      { entradas: 0, saidas: 0, saldo: 0, qtd: 0 },
    )
  }, [data])

  const errorMsg = queryError ? mapError(queryError).description : null
  const isEmpty = !isLoading && data.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centros de Custo"
        description={`Período selecionado: ${formatPeriodoFilter(periodo)}`}
      />

      <Card>
        <CardContent className="space-y-3 p-4">
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={f.reset}>
              <XCircle className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar centros de custo</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Entradas"
          value={formatBRL(totals.entradas)}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          accent="success"
          loading={isLoading}
        />
        <StatCard
          label="Total Saídas"
          value={formatBRL(totals.saidas)}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          accent="destructive"
          loading={isLoading}
        />
        <StatCard
          label="Saldo Líquido"
          value={formatBRL(totals.saldo)}
          icon={<Wallet className="h-5 w-5" />}
          accent={totals.saldo < 0 ? 'destructive' : 'success'}
          loading={isLoading}
        />
        <StatCard
          label="Qtd Lançamentos"
          value={String(totals.qtd)}
          icon={<ListChecks className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Entradas vs Saídas por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isEmpty ? (
              <EmptyChart />
            ) : (
              <CentrosCustoChart data={data} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Distribuição de Saídas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {isEmpty ? <EmptyChart /> : <CentrosCustoPie data={data} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <CentrosCustoTable data={data} loading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyChart(): React.ReactElement {
  return (
    <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
      Nenhum lançamento neste período.
    </div>
  )
}

function subtractDay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-').map((s) => Number.parseInt(s, 10))
  const prev = new Date(y!, m! - 1, (d ?? 1) - 1)
  const yy = prev.getFullYear()
  const mm = String(prev.getMonth() + 1).padStart(2, '0')
  const dd = String(prev.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
