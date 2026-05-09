import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../components/ui/alert'
import { Skeleton } from '../../components/ui/skeleton'
import { EmpresasRanking } from '../../components/magnata/EmpresasRanking'
import { EmpresaHeatmap } from '../../components/magnata/EmpresaHeatmap'
import { saldoPorEmpresaQuery } from '../../lib/magnata-queries'
import { saldoGeralQuery } from '../../lib/queries'
import { mapError } from '../../lib/error-mapper'
import { formatBRL } from '../../lib/format'

export function MagnataEmpresasPage(): React.ReactElement {
  const empresasQ = useQuery(saldoPorEmpresaQuery)
  // Para o heatmap, queremos várias linhas mensais. Buscamos todos os períodos
  // de v_saldo_geral (a view por padrão retorna todos os períodos disponíveis).
  const saldoGeralQ = useQuery(saldoGeralQuery({}))

  const errorMsg = empresasQ.error ?? saldoGeralQ.error
  const errorDescription = errorMsg ? mapError(errorMsg).description : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Empresas"
        description="Saldo consolidado e fluxo mensal por empresa do grupo."
      />

      {errorDescription ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar dados</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Ranking por Saldo</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Empresas ordenadas pelo saldo consolidado das contas.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
            <Building2 className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {empresasQ.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <EmpresasRanking data={empresasQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Heatmap empresa × mês</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Fluxo líquido mensal (entradas − saídas) por empresa nos últimos
            12 meses. Verde = superávit, vermelho = déficit.
          </p>
        </CardHeader>
        <CardContent>
          {empresasQ.isLoading || saldoGeralQ.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <EmpresaHeatmap
              empresas={empresasQ.data ?? []}
              saldoGeral={saldoGeralQ.data ?? []}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(empresasQ.data ?? []).map((emp) => (
          <Card key={emp.empresa_id ?? emp.razao_social}>
            <CardContent className="p-4">
              <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {emp.razao_social ?? '—'}
              </p>
              <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
                {formatBRL(Number(emp.saldo_total ?? 0))}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {emp.qtd_contas ?? 0} conta(s)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default MagnataEmpresasPage
