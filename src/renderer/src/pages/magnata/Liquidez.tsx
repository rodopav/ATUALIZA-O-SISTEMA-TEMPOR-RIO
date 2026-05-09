import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, AlertTriangle } from 'lucide-react'
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
import { ContasLiquidezTable } from '../../components/magnata/ContasLiquidezTable'
import { BancoConcentracaoChart } from '../../components/magnata/BancoConcentracaoChart'
import { contasSaldoMagnataQuery } from '../../lib/magnata-queries'
import { mapError } from '../../lib/error-mapper'
import { formatBRL } from '../../lib/format'

export function MagnataLiquidezPage(): React.ReactElement {
  const contasQ = useQuery(contasSaldoMagnataQuery)
  const errorMsg = contasQ.error ? mapError(contasQ.error).description : null

  const totals = React.useMemo(() => {
    const data = contasQ.data ?? []
    const total = data.reduce((acc, c) => acc + Number(c.saldo_atual ?? 0), 0)
    const positivos = data.filter((c) => Number(c.saldo_atual ?? 0) > 0).length
    const negativos = data.filter((c) => Number(c.saldo_atual ?? 0) < 0).length
    return { total, positivos, negativos, qtd: data.length }
  }, [contasQ.data])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Magnata"
        title="Liquidez"
        description="Saldos consolidados por conta, com concentração por banco."
      />

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar contas</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Saldo total"
          value={formatBRL(totals.total)}
          loading={contasQ.isLoading}
        />
        <MiniStat
          label="Total de contas"
          value={String(totals.qtd).padStart(2, '0')}
          loading={contasQ.isLoading}
        />
        <MiniStat
          label="Contas positivas"
          value={String(totals.positivos).padStart(2, '0')}
          loading={contasQ.isLoading}
          tone="success"
        />
        <MiniStat
          label="Contas negativas"
          value={String(totals.negativos).padStart(2, '0')}
          loading={contasQ.isLoading}
          tone={totals.negativos > 0 ? 'destructive' : 'default'}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Concentração de Saldo por Banco</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Saldo agregado por instituição financeira.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amb-400/10 text-amb-500 dark:text-amb-300">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {contasQ.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <BancoConcentracaoChart contas={contasQ.data ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas e saldos</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Lista completa com cor por status e filtro por empresa.
          </p>
        </CardHeader>
        <CardContent>
          {contasQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <ContasLiquidezTable contas={contasQ.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface MiniStatProps {
  label: string
  value: string
  loading: boolean
  tone?: 'default' | 'success' | 'destructive'
}

function MiniStat({
  label,
  value,
  loading,
  tone = 'default',
}: MiniStatProps): React.ReactElement {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'destructive'
        ? 'text-destructive'
        : 'text-foreground'
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-2">
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className={`text-xl font-semibold tabular-nums ${toneClass}`}>
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MagnataLiquidezPage
