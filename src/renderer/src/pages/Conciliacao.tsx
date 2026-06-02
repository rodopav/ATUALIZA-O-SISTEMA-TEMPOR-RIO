import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  XCircle,
  X,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Spinner } from '../components/ui/spinner'
import { toast } from '../components/ui/use-toast'
import { StatCard } from '../components/dashboards/StatCard'
import { PendentesTable } from '../components/conciliacao/PendentesTable'
import { ConciliarPendenteModal } from '../components/conciliacao/ConciliarPendenteModal'
import {
  pendentesQuery,
  conciliacaoResumoQuery,
  conciliarLancamentosBatch,
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
import { useAuthStore } from '../lib/auth-store'

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
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

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
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

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

  // Limpa seleção quando os filtros mudam — IDs antigos podem nem estar
  // mais na lista visível, então melhor zerar pra não conciliar fantasma.
  React.useEffect(() => {
    setSelectedIds(new Set())
  }, [filters])

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

  const toggleOne = React.useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = React.useCallback((visibleIds: string[]): void => {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.has(id))
      if (allSelected) {
        // desmarca só os visíveis (preserva eventuais selecionados fora dessa página)
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      }
      // marca todos os visíveis
      const next = new Set(prev)
      visibleIds.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), [])

  const bulkMutation = useMutation({
    mutationFn: async (): Promise<{
      conciliados: string[]
      falhou: string[]
    }> => {
      if (!profile) throw new Error('Sessão expirada.')
      const ids = Array.from(selectedIds)
      if (ids.length === 0) {
        return { conciliados: [], falhou: [] }
      }
      return conciliarLancamentosBatch({
        ids,
        profileId: profile.id,
        observacao: null,
      })
    },
    onSuccess: ({ conciliados, falhou }) => {
      void qc.invalidateQueries({
        queryKey: ['conciliacao'],
        refetchType: 'active',
      })
      void qc.invalidateQueries({
        queryKey: ['lancamentos'],
        refetchType: 'active',
      })
      setSelectedIds(new Set())
      if (falhou.length === 0) {
        toast({
          title: `${conciliados.length} ${conciliados.length === 1 ? 'lançamento conciliado' : 'lançamentos conciliados'}`,
          variant: 'success',
        })
      } else {
        toast({
          title: `${conciliados.length} conciliados • ${falhou.length} falharam`,
          description:
            'Verifique se você tem permissão pra conciliar todas as contas envolvidas.',
          variant: 'warning',
        })
      }
    },
    onError: (err) => {
      toast({
        title: 'Erro ao conciliar em lote',
        description: mapError(err).description,
        variant: 'destructive',
      })
    },
  })

  const selectedCount = selectedIds.size

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
            selectedIds={selectedIds}
            onToggleOne={toggleOne}
            onToggleAll={toggleAll}
          />
        </CardContent>
      </Card>

      {/* Barra flutuante de ação em lote — só aparece quando há seleção. */}
      {selectedCount > 0 ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg sm:py-3">
            <span className="text-sm font-medium text-foreground">
              {selectedCount}{' '}
              {selectedCount === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <span className="text-xs text-muted-foreground">
              Conciliar em lote sem observação.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={bulkMutation.isPending}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => bulkMutation.mutate()}
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
              Conciliar {selectedCount}
            </Button>
          </div>
        </div>
      ) : null}

      <ConciliarPendenteModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={target}
      />
    </div>
  )
}

export default ConciliacaoPage
