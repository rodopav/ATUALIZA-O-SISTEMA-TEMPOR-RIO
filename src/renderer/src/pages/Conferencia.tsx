import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  CheckCircle2,
  Calculator,
  Wallet,
  ArrowRightLeft,
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
import { DivergenciasTable } from '../components/dashboards/DivergenciasTable'
import { useConferencia, useDivergencias } from '../lib/dashboards-queries'
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

export default function ConferenciaPage(): React.ReactElement {
  const [periodo, setPeriodo] = React.useState<string>(() => currentPeriodoIso())
  const conferenciaQ = useConferencia(periodo)
  const status = conferenciaQ.data?.status ?? null
  const isDivergente = status === 'DIVERGENTE'

  const divergQ = useDivergencias(periodo)

  const errorMsg = React.useMemo(() => {
    if (conferenciaQ.error) return mapError(conferenciaQ.error).description
    if (divergQ.error) return mapError(divergQ.error).description
    return null
  }, [conferenciaQ.error, divergQ.error])

  const data = conferenciaQ.data
  const contasDivergentes = data?.contas_divergentes ?? 0
  const saldoGeralLink = `/dashboard/saldo-geral?status=DIVERGENTE&periodo=${periodo}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conferência"
        description={`Período selecionado: ${formatPeriodo(periodo)}`}
      />

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="periodo-conf">Período</Label>
            <Input
              id="periodo-conf"
              type="month"
              value={periodoToInputValue(periodo)}
              onChange={(e) => setPeriodo(inputValueToPeriodo(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar conferência</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5">
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saldo Inicial"
            value={formatBRL(data?.total_saldo_inicial ?? 0)}
            icon={<Wallet className="h-5 w-5" />}
            loading={conferenciaQ.isLoading}
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Entradas"
            value={formatBRL(data?.total_entradas ?? 0)}
            icon={<ArrowUpCircle className="h-5 w-5" />}
            accent="success"
            loading={conferenciaQ.isLoading}
            description="Apenas operacionais."
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saídas"
            value={formatBRL(data?.total_saidas ?? 0)}
            icon={<ArrowDownCircle className="h-5 w-5" />}
            accent="destructive"
            loading={conferenciaQ.isLoading}
            description="Apenas operacionais."
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saldo Atual"
            value={formatBRL(data?.total_saldo_atual ?? 0)}
            icon={<Wallet className="h-5 w-5" />}
            accent="info"
            loading={conferenciaQ.isLoading}
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saldo Calculado"
            value={formatBRL(data?.saldo_calculado ?? 0)}
            icon={<Calculator className="h-5 w-5" />}
            accent="info"
            loading={conferenciaQ.isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Transferências internas (entrada)"
          value={formatBRL(data?.total_transferencias_recebidas ?? 0)}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          accent="info"
          loading={conferenciaQ.isLoading}
          description="Movem saldo entre contas próprias, não contam como fluxo operacional."
        />
        <StatCard
          label="Transferências internas (saída)"
          value={formatBRL(data?.total_transferencias_enviadas ?? 0)}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          accent="info"
          loading={conferenciaQ.isLoading}
          description="Movem saldo entre contas próprias, não contam como fluxo operacional."
        />
      </div>

      {!conferenciaQ.isLoading && status ? (
        isDivergente ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: existe divergência</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {contasDivergentes === 1
                  ? '1 conta com saldo divergente.'
                  : `${contasDivergentes} contas com saldo divergente.`}{' '}
                Verifique os movimentos.
              </p>
              <Link
                to={saldoGeralLink}
                className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                Abrir contas divergentes em Saldo Geral
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Conferido</AlertTitle>
            <AlertDescription>
              O saldo atual confere com a soma de saldo inicial, entradas e
              saídas. Nenhuma divergência identificada no período.
            </AlertDescription>
          </Alert>
        )
      ) : null}

      {isDivergente ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contas divergentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DivergenciasTable
              data={divergQ.data ?? []}
              loading={divergQ.isLoading}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
