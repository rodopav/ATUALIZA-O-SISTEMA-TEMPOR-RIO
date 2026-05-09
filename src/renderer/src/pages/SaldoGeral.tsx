import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CalendarRange, Filter, Download } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { EmpresaMultiSelect } from '../components/EmpresaMultiSelect'
import { SaldoGeralTable } from '../components/SaldoGeralTable'
import {
  saldoGeralQuery,
  empresasQuery,
  currentPeriodoIso,
} from '../lib/queries'
import { formatPeriodo } from '../lib/format'
import { mapError } from '../lib/error-mapper'
import { cn } from '../lib/cn'
import { downloadCsv, brlNumber, type CsvColumn } from '../lib/csv-export'
import type { Tables } from '../../../shared/database.types'

type SaldoRow = Tables<'v_saldo_geral'>

function periodoToInputValue(iso: string): string {
  return iso.slice(0, 7)
}

function inputValueToPeriodo(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return currentPeriodoIso()
  return `${value}-01`
}

export function SaldoGeralPage(): React.ReactElement {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPeriodo = currentPeriodoIso()
  const initialDivergentes = searchParams.get('status') === 'DIVERGENTE'

  const [periodo, setPeriodo] = React.useState<string>(initialPeriodo)
  const [empresaIds, setEmpresaIds] = React.useState<string[]>([])
  const [onlyDivergentes, setOnlyDivergentes] = React.useState<boolean>(
    initialDivergentes,
  )

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

  const empresasQ = useQuery(empresasQuery)
  const saldoQ = useQuery(
    saldoGeralQuery({ periodo, empresaIds, onlyDivergentes }),
  )

  const errorMsg = saldoQ.error ? mapError(saldoQ.error).description : null

  const handleExportCsv = React.useCallback((): void => {
    const rows = (saldoQ.data ?? []) as SaldoRow[]
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
      { header: 'Período fechado', accessor: (r) => (r.periodo_fechado ? 'Sim' : 'Não') },
    ]
    downloadCsv(`saldo-geral-${periodo.slice(0, 7)}.csv`, cols, rows)
  }, [saldoQ.data, periodo])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tesouraria"
        title="Saldo geral"
        description={`Conferência consolidada das contas — ${formatPeriodo(periodo)}.`}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!saldoQ.data || saldoQ.data.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_2fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="periodo-input" className="flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              Período
            </Label>
            <Input
              id="periodo-input"
              type="month"
              value={periodoToInputValue(periodo)}
              onChange={(e) => setPeriodo(inputValueToPeriodo(e.target.value))}
            />
          </div>

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
            onClick={() => setOnlyDivergentes((v) => !v)}
          >
            {onlyDivergentes ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Filter className="h-4 w-4" />
            )}
            {onlyDivergentes ? 'Apenas divergentes' : 'Mostrar divergentes'}
          </Button>
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
          <SaldoGeralTable
            data={saldoQ.data ?? []}
            loading={saldoQ.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
