import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ListChecks, AlertTriangle, Download } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { DataTable } from '../components/ui/data-table'
import {
  FiltersBar,
  defaultFilters,
  type LancamentosFiltersState,
} from '../components/lancamentos/FiltersBar'
import { buildLancamentoColumns } from '../components/lancamentos/columns'
import { EstornoModal } from '../components/lancamentos/EstornoModal'
import { ConciliarModal } from '../components/lancamentos/ConciliarModal'
import {
  lancamentosListQuery,
  type LancamentoRow,
} from '../lib/lancamentos-queries'
import { centrosCustoQuery } from '../lib/queries'
import { contasLookupQuery } from '../lib/contas-lookup-query'
import { mapError } from '../lib/error-mapper'
import { cn } from '../lib/cn'
import { downloadCsv } from '../lib/csv-export'
import { buildLancamentosCsvColumns } from '../components/lancamentos/lancamentos-csv'
import { useAuthStore } from '../lib/auth-store'
import { desfazerConciliacao } from '../lib/conciliacao-queries'
import { toast } from '../components/ui/use-toast'

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function LancamentosPage(): React.ReactElement {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const [filters, setFilters] = React.useState<LancamentosFiltersState>(
    defaultFilters,
  )
  const [estornoTarget, setEstornoTarget] = React.useState<LancamentoRow | null>(
    null,
  )
  const [estornoOpen, setEstornoOpen] = React.useState(false)
  const [conciliarTarget, setConciliarTarget] =
    React.useState<LancamentoRow | null>(null)
  const [conciliarOpen, setConciliarOpen] = React.useState(false)

  const debouncedSearch = useDebounced(filters.search, 300)

  const periodoIso = filters.periodoMonth
    ? `${filters.periodoMonth}-01`
    : null

  const lancamentosQ = useQuery(
    lancamentosListQuery({
      periodo: periodoIso,
      natureza: filters.natureza,
      centroCustoId: filters.centroCustoId,
      search: debouncedSearch,
    }),
  )
  const centrosQ = useQuery(centrosCustoQuery)
  const contasLookupQ = useQuery(contasLookupQuery)

  const desfazerMut = useMutation({
    mutationFn: (id: string) => desfazerConciliacao(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lancamentos'] })
      void qc.invalidateQueries({ queryKey: ['conciliacao'] })
      toast({
        title: 'Conciliação desfeita',
        description: 'O lançamento voltou ao status pendente.',
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Falhou ao desfazer',
        description: mapError(err).description,
        variant: 'destructive',
      })
    },
  })

  const navigateToNew = React.useCallback((): void => {
    navigate('/lancamentos/novo')
  }, [navigate])

  React.useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        navigateToNew()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigateToNew])

  const handleEdit = (row: LancamentoRow): void => {
    navigate(`/lancamentos/${row.id}`)
  }

  const handleEstornar = (row: LancamentoRow): void => {
    setEstornoTarget(row)
    setEstornoOpen(true)
  }

  const handleView = (row: LancamentoRow): void => {
    navigate(`/lancamentos/${row.id}`)
  }

  const handleConciliar = React.useCallback(
    (row: LancamentoRow): void => {
      setConciliarTarget(row)
      setConciliarOpen(true)
    },
    [],
  )

  const handleDesfazer = React.useCallback(
    (row: LancamentoRow): void => {
      desfazerMut.mutate(row.id)
    },
    [desfazerMut],
  )

  const columns = React.useMemo(
    () =>
      buildLancamentoColumns(
        {
          onEdit: handleEdit,
          onEstornar: handleEstornar,
          onView: handleView,
          onConciliar: handleConciliar,
          onDesfazerConciliacao: handleDesfazer,
          isAdmin,
        },
        { contasLookup: contasLookupQ.data },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, isAdmin, handleConciliar, handleDesfazer, contasLookupQ.data],
  )

  const errorMsg = lancamentosQ.error
    ? mapError(lancamentosQ.error).description
    : null

  const data = lancamentosQ.data ?? []

  const handleExportCsv = React.useCallback((): void => {
    if (data.length === 0) return
    const periodoTag = filters.periodoMonth ?? 'todos'
    downloadCsv(`lancamentos-${periodoTag}.csv`, buildLancamentosCsvColumns(), data)
  }, [data, filters.periodoMonth])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Lançamentos"
        description="Movimentações financeiras registradas no período."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportCsv}
              disabled={data.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button type="button" onClick={navigateToNew}>
              <Plus className="h-4 w-4" />
              Novo lançamento
              <span className="ml-1 hidden rounded bg-primary-foreground/15 px-1.5 py-0.5 font-mono text-[10px] tracking-wider md:inline">
                Ctrl+N
              </span>
            </Button>
          </div>
        }
      />

      <FiltersBar
        value={filters}
        onChange={setFilters}
        centrosCusto={centrosQ.data ?? []}
      />

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar lançamentos</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable<LancamentoRow>
            columns={columns}
            data={data}
            isLoading={lancamentosQ.isLoading}
            emptyIcon={<ListChecks />}
            emptyTitle="Nenhum lançamento encontrado"
            emptyMessage="Ajuste os filtros ou registre o primeiro lançamento do período."
            emptyAction={
              <Button onClick={navigateToNew}>
                <Plus className="h-4 w-4" />
                Novo lançamento
              </Button>
            }
            virtualize={data.length > 100}
            rowClassName={(row) =>
              cn(
                row.estorno_de_id && 'bg-warning/[0.04]',
                row.estorno && 'opacity-70',
              )
            }
          />
        </CardContent>
      </Card>

      <EstornoModal
        open={estornoOpen}
        onOpenChange={setEstornoOpen}
        original={estornoTarget}
      />

      <ConciliarModal
        open={conciliarOpen}
        onOpenChange={setConciliarOpen}
        target={conciliarTarget}
      />
    </div>
  )
}
