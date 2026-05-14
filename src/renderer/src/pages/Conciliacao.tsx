import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { StatCard } from '../components/dashboards/StatCard'
import { PendentesTable } from '../components/conciliacao/PendentesTable'
import { ConciliarPendenteModal } from '../components/conciliacao/ConciliarPendenteModal'
import {
  pendentesQuery,
  conciliacaoResumoQuery,
  type PendenteConciliacaoRow,
  type PendentesFilters,
} from '../lib/conciliacao-queries'
import { currentPeriodoIso } from '../lib/queries'
import {
  PeriodoFilter,
  defaultPeriodoValue,
  formatPeriodoFilter,
  periodoBounds,
  type PeriodoFilterValue,
} from '../components/filters/PeriodoFilter'
import { ContaFilter } from '../components/filters/ContaFilter'
import { mapError } from '../lib/error-mapper'

export function ConciliacaoPage(): React.ReactElement {
  const [periodo, setPeriodo] = React.useState<PeriodoFilterValue>(() =>
    defaultPeriodoValue(currentPeriodoIso()),
  )
  const [contaId, setContaId] = React.useState<string | null>(null)
  const [target, setTarget] = React.useState<PendenteConciliacaoRow | null>(
    null,
  )
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const filters: PendentesFilters = React.useMemo(() => {
    const bounds = periodoBounds(periodo)
    if (periodo.mode === 'intervalo' && bounds) {
      return {
        periodo: null,
        dataInicio: bounds.start,
        dataFimExclusive: bounds.endExclusive,
        contaId,
      }
    }
    return { periodo: periodo.mesIso, contaId }
  }, [periodo, contaId])

  const pendentesQ = useQuery(pendentesQuery(filters))
  const resumoQ = useQuery(conciliacaoResumoQuery(filters))

  const errorMsg = React.useMemo(() => {
    if (pendentesQ.error) return mapError(pendentesQ.error).description
    if (resumoQ.error) return mapError(resumoQ.error).description
    return null
  }, [pendentesQ.error, resumoQ.error])

  const handleConciliar = React.useCallback(
    (row: PendenteConciliacaoRow): void => {
      setTarget(row)
      setDialogOpen(true)
    },
    [],
  )

  const resumo = resumoQ.data
  const percentualLabel = resumo
    ? `${resumo.percentualConciliado.toFixed(1).replace('.', ',')}%`
    : '—'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Conciliação bancária"
        description={`Acompanhe lançamentos pendentes — ${formatPeriodoFilter(periodo)}.`}
      />

      <Card>
        <CardContent className="grid gap-4 p-4 md:grid-cols-2">
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
          <ContaFilter value={contaId} onChange={setContaId} />
        </CardContent>
      </Card>

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar conciliação</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendentes"
          value={String(resumo?.pendentes ?? 0).padStart(2, '0')}
          icon={<AlertCircle className="h-5 w-5" />}
          accent="destructive"
          loading={resumoQ.isLoading}
          description="Aguardando conferência."
        />
        <StatCard
          label="Conciliados"
          value={String(resumo?.conciliados ?? 0).padStart(2, '0')}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
          loading={resumoQ.isLoading}
          description={`Total: ${String(resumo?.total ?? 0).padStart(2, '0')}`}
        />
        <StatCard
          label="% conciliado"
          value={percentualLabel}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="info"
          loading={resumoQ.isLoading}
          description="Sobre o total do período."
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <PendentesTable
            data={pendentesQ.data ?? []}
            loading={pendentesQ.isLoading}
            onConciliar={handleConciliar}
          />
        </CardContent>
      </Card>

      <ConciliarPendenteModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={target}
      />
    </div>
  )
}

export default ConciliacaoPage
