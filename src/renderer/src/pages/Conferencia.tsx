import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { DivergenciasTable } from '../components/dashboards/DivergenciasTable'
import { SaldosConsolidadosCards } from '../components/dashboards/SaldosConsolidadosCards'
import {
  conferenciaQuery,
  conferenciaIntervaloQuery,
  divergenciasQuery,
  saldoGeralIntervaloQuery,
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

interface ConferenciaFilters {
  periodo: PeriodoFilterValue
}

const defaultConferenciaFilters: ConferenciaFilters = {
  periodo: defaultPeriodoValue(currentPeriodoIso()),
}

export default function ConferenciaPage(): React.ReactElement {
  const f = usePageFilters('conferencia', defaultConferenciaFilters)
  const { periodo } = f.value

  const setPeriodo = React.useCallback(
    (next: PeriodoFilterValue) => f.set({ periodo: next }),
    [f],
  )

  // Quando intervalo: usa RPCs por intervalo. Quando mês: views agregadas.
  const isIntervalo = periodo.mode === 'intervalo'
  const bounds = periodoBounds(periodo)
  const rangeReady =
    isIntervalo && bounds && periodo.dataInicio && periodo.dataFim
      ? { dataInicio: bounds.start, dataFim: subtractDay(bounds.endExclusive) }
      : null

  const conferenciaMesQ = useQuery({
    ...conferenciaQuery(periodo.mesIso),
    enabled: !isIntervalo,
  })
  const conferenciaIntQ = useQuery({
    ...conferenciaIntervaloQuery(rangeReady ?? { dataInicio: '', dataFim: '' }),
    enabled: Boolean(rangeReady),
  })

  const data = isIntervalo ? conferenciaIntQ.data : conferenciaMesQ.data
  const isLoading = isIntervalo
    ? conferenciaIntQ.isLoading
    : conferenciaMesQ.isLoading
  const queryError = isIntervalo ? conferenciaIntQ.error : conferenciaMesQ.error

  const status = data?.status ?? null
  const isDivergente = status === 'DIVERGENTE'

  // Divergências detalhadas
  const divergMesQ = useQuery({
    ...divergenciasQuery(periodo.mesIso),
    enabled: !isIntervalo && isDivergente,
  })
  const divergIntQ = useQuery({
    ...saldoGeralIntervaloQuery(
      rangeReady ?? { dataInicio: '', dataFim: '' },
      { onlyDivergentes: true },
    ),
    enabled: Boolean(rangeReady) && isDivergente,
  })
  const divergRows = isIntervalo ? divergIntQ.data ?? [] : divergMesQ.data ?? []
  const divergLoading = isIntervalo ? divergIntQ.isLoading : divergMesQ.isLoading

  const errorMsg = React.useMemo(() => {
    if (queryError) return mapError(queryError).description
    return null
  }, [queryError])

  const contasDivergentes = Number(data?.contas_divergentes ?? 0)
  const saldoGeralLink = isIntervalo
    ? `/dashboard/saldo-geral?status=DIVERGENTE&dataInicio=${periodo.dataInicio}&dataFim=${periodo.dataFim}`
    : `/dashboard/saldo-geral?status=DIVERGENTE&periodo=${periodo.mesIso}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conferência"
        description={`Período selecionado: ${formatPeriodoFilter(periodo)}`}
      />

      <SaldosConsolidadosCards />

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
          <AlertTitle>Erro ao carregar conferência</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5">
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saldo Inicial"
            value={formatBRL(Number(data?.total_saldo_inicial ?? 0))}
            icon={<Wallet className="h-5 w-5" />}
            loading={isLoading}
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Entradas"
            value={formatBRL(Number(data?.total_entradas ?? 0))}
            icon={<ArrowUpCircle className="h-5 w-5" />}
            accent="success"
            loading={isLoading}
            description="Apenas operacionais."
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saídas"
            value={formatBRL(Number(data?.total_saidas ?? 0))}
            icon={<ArrowDownCircle className="h-5 w-5" />}
            accent="destructive"
            loading={isLoading}
            description="Apenas operacionais."
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saldo Atual"
            value={formatBRL(Number(data?.total_saldo_atual ?? 0))}
            icon={<Wallet className="h-5 w-5" />}
            accent="info"
            loading={isLoading}
          />
        </div>
        <div className="min-w-[12rem] sm:min-w-0">
          <StatCard
            label="Saldo Calculado"
            value={formatBRL(Number(data?.saldo_calculado ?? 0))}
            icon={<Calculator className="h-5 w-5" />}
            accent="info"
            loading={isLoading}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Transferências internas (entrada)"
          value={formatBRL(Number(data?.total_transferencias_recebidas ?? 0))}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          accent="info"
          loading={isLoading}
          description="Movem saldo entre contas próprias, não contam como fluxo operacional."
        />
        <StatCard
          label="Transferências internas (saída)"
          value={formatBRL(Number(data?.total_transferencias_enviadas ?? 0))}
          icon={<ArrowRightLeft className="h-5 w-5" />}
          accent="info"
          loading={isLoading}
          description="Movem saldo entre contas próprias, não contam como fluxo operacional."
        />
      </div>

      {!isLoading && status ? (
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
            <DivergenciasTable data={divergRows} loading={divergLoading} />
          </CardContent>
        </Card>
      ) : null}
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
