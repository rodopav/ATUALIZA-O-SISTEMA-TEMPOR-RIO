import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
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
import { usePageFilters } from '../lib/filters-store'

interface ConciliacaoFilters {
  periodo: PeriodoFilterValue
  contaId: string | null
}

const defaultConciliacaoFilters: ConciliacaoFilters = {
  periodo: defaultPeriodoValue(currentPeriodoIso()),
  contaId: null,
}

export function ConciliacaoPage(): React.ReactElement {
  const f = usePageFilters('conciliacao', defaultConciliacaoFilters)
  const { periodo, contaId } = f.value

  const setPeriodo = React.useCallback(
    (next: PeriodoFilterValue) => f.set({ periodo: next }),
    [f],
  )
  const setContaId = React.useCallback(
    (next: string | null) => f.set({ contaId: next }),
    [f],
  )

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
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <PeriodoFilter value={periodo} onChange={setPeriodo} />
            <ContaFilter value={contaId} onChange={setContaId} />
          </div>
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
