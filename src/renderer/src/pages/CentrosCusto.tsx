import * as React from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ListChecks,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { StatCard } from '../components/dashboards/StatCard'
import { CentrosCustoChart } from '../components/dashboards/CentrosCustoChart'
import { CentrosCustoPie } from '../components/dashboards/CentrosCustoPie'
import { CentrosCustoTable } from '../components/dashboards/CentrosCustoTable'
import { useCentrosCustoDashboard } from '../lib/dashboards-queries'
import { currentPeriodoIso } from '../lib/queries'
import { formatBRL, formatPeriodo } from '../lib/format'
import { mapError } from '../lib/error-mapper'

function periodoToInputValue(iso: string): string {
  return iso.slice(0, 7)
}

function inputValueToPeriodo(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return currentPeriodoIso()
  return `${value}-01`
}

export default function CentrosCustoPage(): React.ReactElement {
  const [periodo, setPeriodo] = React.useState<string>(() => currentPeriodoIso())
  const dashQ = useCentrosCustoDashboard(periodo)

  const totals = React.useMemo(() => {
    const rows = dashQ.data ?? []
    return rows.reduce(
      (acc, r) => {
        acc.entradas += r.entradas ?? 0
        acc.saidas += r.saidas ?? 0
        acc.saldo += r.saldo_liquido ?? 0
        acc.qtd += r.qtd_lancamentos ?? 0
        return acc
      },
      { entradas: 0, saidas: 0, saldo: 0, qtd: 0 },
    )
  }, [dashQ.data])

  const errorMsg = dashQ.error ? mapError(dashQ.error).description : null
  const data = dashQ.data ?? []
  const isEmpty = !dashQ.isLoading && data.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centros de Custo"
        description={`Período selecionado: ${formatPeriodo(periodo)}`}
      />

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="periodo-cc">Período</Label>
            <Input
              id="periodo-cc"
              type="month"
              value={periodoToInputValue(periodo)}
              onChange={(e) => setPeriodo(inputValueToPeriodo(e.target.value))}
            />
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
          loading={dashQ.isLoading}
        />
        <StatCard
          label="Total Saídas"
          value={formatBRL(totals.saidas)}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          accent="destructive"
          loading={dashQ.isLoading}
        />
        <StatCard
          label="Saldo Líquido"
          value={formatBRL(totals.saldo)}
          icon={<Wallet className="h-5 w-5" />}
          accent={totals.saldo < 0 ? 'destructive' : 'success'}
          loading={dashQ.isLoading}
        />
        <StatCard
          label="Qtd Lançamentos"
          value={String(totals.qtd)}
          icon={<ListChecks className="h-5 w-5" />}
          loading={dashQ.isLoading}
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
          <CentrosCustoTable data={data} loading={dashQ.isLoading} />
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
