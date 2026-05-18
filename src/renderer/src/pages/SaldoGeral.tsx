import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Filter, Download, XCircle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { EmpresaMultiSelect } from '../components/EmpresaMultiSelect'
import { SaldoGeralTable } from '../components/SaldoGeralTable'
import { SaldosConsolidadosCards } from '../components/dashboards/SaldosConsolidadosCards'
import { LimitesPorContaSection } from '../components/dashboards/LimitesPorContaSection'
import {
  saldoGeralQuery,
  empresasQuery,
  currentPeriodoIso,
} from '../lib/queries'
import { saldoGeralIntervaloQuery } from '../lib/dashboards-queries'
import {
  PeriodoFilter,
  defaultPeriodoValue,
  formatPeriodoFilter,
  periodoBounds,
  type PeriodoFilterValue,
} from '../components/filters/PeriodoFilter'
import { ContaFilter } from '../components/filters/ContaFilter'
import { mapError } from '../lib/error-mapper'
import { cn } from '../lib/cn'
import { downloadCsv, brlNumber, type CsvColumn } from '../lib/csv-export'
import { usePageFilters } from '../lib/filters-store'
import type { Tables } from '../../../shared/database.types'

type SaldoRow = Tables<'v_saldo_geral'>

interface SaldoGeralFilters {
  periodo: PeriodoFilterValue
  empresaIds: string[]
  contaId: string | null
  onlyDivergentes: boolean
}

const defaultSaldoGeralFilters: SaldoGeralFilters = {
  periodo: defaultPeriodoValue(currentPeriodoIso()),
  empresaIds: [],
  contaId: null,
  onlyDivergentes: false,
}

export function SaldoGeralPage(): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams()
  const f = usePageFilters('saldo_geral', defaultSaldoGeralFilters)
  const { periodo, empresaIds, contaId, onlyDivergentes } = f.value

  const setPeriodo = React.useCallback(
    (next: PeriodoFilterValue) => f.set({ periodo: next }),
    [f],
  )
  const setEmpresaIds = React.useCallback(
    (next: string[]) => f.set({ empresaIds: next }),
    [f],
  )
  const setContaId = React.useCallback(
    (next: string | null) => f.set({ contaId: next }),
    [f],
  )
  const setOnlyDivergentes = React.useCallback(
    (next: boolean) => f.set({ onlyDivergentes: next }),
    [f],
  )

  // Search param "?status=DIVERGENTE" (vindo da Conferência) força o filtro
  // na primeira montagem — não toda atualização, pra respeitar a escolha do usuário.
  const appliedInitialDivergentes = React.useRef(false)
  React.useEffect(() => {
    if (appliedInitialDivergentes.current) return
    appliedInitialDivergentes.current = true
    if (searchParams.get('status') === 'DIVERGENTE' && !onlyDivergentes) {
      setOnlyDivergentes(true)
    }
  }, [searchParams, onlyDivergentes, setOnlyDivergentes])

  React.useEffect(() => {
    setSearchParams(
      (p) => {
        if (onlyDivergentes) {
          p.set('status', 'DIVERGENTE')
        } else {
          p.delete('status')
        }
        return p
      },
      { replace: true },
    )
  }, [onlyDivergentes, setSearchParams])

  const isIntervalo = periodo.mode === 'intervalo'
  const bounds = periodoBounds(periodo)
  const rangeReady =
    isIntervalo && bounds && periodo.dataInicio && periodo.dataFim
      ? { dataInicio: bounds.start, dataFim: subtractDay(bounds.endExclusive) }
      : null

  const empresasQ = useQuery(empresasQuery)

  const mesQ = useQuery({
    ...saldoGeralQuery({
      periodo: periodo.mesIso,
      empresaIds,
      onlyDivergentes,
    }),
    enabled: !isIntervalo,
  })
  const intQ = useQuery({
    ...saldoGeralIntervaloQuery(
      rangeReady ?? { dataInicio: '', dataFim: '' },
      {
        empresaIds,
        contaIds: contaId ? [contaId] : undefined,
        onlyDivergentes,
      },
    ),
    enabled: Boolean(rangeReady),
  })

  // Filtra client-side por conta no modo mês (no intervalo já filtra server-side)
  const rawRows = (isIntervalo ? intQ.data : mesQ.data) ?? []
  const rows = React.useMemo(() => {
    if (isIntervalo || !contaId) return rawRows
    return rawRows.filter((r) => r.conta_id === contaId)
  }, [rawRows, contaId, isIntervalo])

  const queryError = isIntervalo ? intQ.error : mesQ.error
  const isLoading = isIntervalo ? intQ.isLoading : mesQ.isLoading
  const errorMsg = queryError ? mapError(queryError).description : null

  const handleExportCsv = React.useCallback((): void => {
    if (rows.length === 0) return
    const cols: CsvColumn<SaldoRow>[] = [
      { header: 'Empresa', accessor: (r) => r.empresa ?? '' },
      { header: 'Conta', accessor: (r) => r.conta ?? '' },
      { header: 'Tipo', accessor: (r) => r.conta_tipo ?? '' },
      { header: 'Saldo Inicial', accessor: (r) => brlNumber(r.saldo_inicial) },
      { header: 'Entradas', accessor: (r) => brlNumber(r.entradas) },
      { header: 'Saídas', accessor: (r) => brlNumber(r.saidas) },
      {
        header: 'Transf. recebidas',
        accessor: (r) => brlNumber(r.transferencias_recebidas),
      },
      {
        header: 'Transf. enviadas',
        accessor: (r) => brlNumber(r.transferencias_enviadas),
      },
      { header: 'Saldo Atual', accessor: (r) => brlNumber(r.saldo_atual) },
      { header: 'Status', accessor: (r) => r.status ?? '' },
    ]
    const tag = isIntervalo
      ? `${periodo.dataInicio}_a_${periodo.dataFim}`
      : periodo.mesIso.slice(0, 7)
    downloadCsv(`saldo-geral-${tag}.csv`, cols, rows)
  }, [rows, isIntervalo, periodo])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tesouraria"
        title="Saldo geral"
        description={`Conferência consolidada das contas — ${formatPeriodoFilter(periodo)}.`}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <SaldosConsolidadosCards />

      <LimitesPorContaSection />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <PeriodoFilter value={periodo} onChange={setPeriodo} />
            <ContaFilter value={contaId} onChange={setContaId} />
            <EmpresaMultiSelect
              empresas={empresasQ.data ?? []}
              value={empresaIds}
              onChange={setEmpresaIds}
              loading={empresasQ.isLoading}
            />
            <Button
              id="divergentes-toggle"
              type="button"
              variant={onlyDivergentes ? 'destructive' : 'outline'}
              className={cn(
                'h-10 justify-center',
                onlyDivergentes && 'shadow-sm',
              )}
              onClick={() => setOnlyDivergentes(!onlyDivergentes)}
            >
              {onlyDivergentes ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              {onlyDivergentes ? 'Apenas divergentes' : 'Mostrar divergentes'}
            </Button>
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
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar saldos</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <SaldoGeralTable data={rows} loading={isLoading} />
        </CardContent>
      </Card>
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
