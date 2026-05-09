import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Spinner } from '../../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert'
import { toast } from '../../ui/use-toast'
import { mapError } from '../../../lib/error-mapper'
import { formatBRL, formatPeriodo } from '../../../lib/format'
import {
  fetchPeriodoSummary,
  useFecharMes,
  totalsFromRows,
} from './useFecharMes'

interface FecharMesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodo: string | null
}

export function FecharMesDialog({
  open,
  onOpenChange,
  periodo,
}: FecharMesDialogProps): React.ReactElement {
  const summaryQ = useQuery({
    queryKey: ['admin', 'periodo_summary', periodo],
    queryFn: () => {
      if (!periodo) throw new Error('Período inválido.')
      return fetchPeriodoSummary(periodo)
    },
    enabled: open && !!periodo,
    staleTime: 0,
  })
  const mutation = useFecharMes()

  const handleConfirm = async (): Promise<void> => {
    if (!periodo || !summaryQ.data) return
    try {
      await mutation.mutateAsync({
        periodo,
        rows: summaryQ.data.rows,
      })
      toast({
        title: 'Período fechado',
        description: `${formatPeriodo(periodo)} foi marcado como fechado.`,
        variant: 'success',
      })
      onOpenChange(false)
    } catch (err) {
      const m = mapError(err)
      toast({ title: m.title, description: m.description, variant: 'destructive' })
    }
  }

  const totals = summaryQ.data
    ? summaryQ.data.totals
    : { saldo_inicial: 0, entradas: 0, saidas: 0, saldo_atual: 0, rows: 0 }
  const errorMsg = summaryQ.error ? mapError(summaryQ.error).description : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Fechar período {periodo ? formatPeriodo(periodo) : ''}
          </DialogTitle>
          <DialogDescription>
            Revise os totais consolidados antes de fechar. Após o fechamento,
            apenas o admin financeiro poderá editar lançamentos deste período.
          </DialogDescription>
        </DialogHeader>

        {errorMsg ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar resumo</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        ) : null}

        {summaryQ.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size={20} />
          </div>
        ) : (
          <SummaryTable
            rowCount={summaryQ.data?.rows.length ?? 0}
            totals={summaryQ.data ? totalsFromRows(summaryQ.data.rows) : totals}
          />
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={summaryQ.isLoading || mutation.isPending || !!errorMsg}
          >
            {mutation.isPending ? <Spinner /> : null}
            Confirmar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SummaryTableProps {
  rowCount: number
  totals: {
    saldo_inicial: number
    entradas: number
    saidas: number
    saldo_atual: number
  }
}

function SummaryTable({ rowCount, totals }: SummaryTableProps): React.ReactElement {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="border-b px-4 py-3 text-left font-medium">Métrica</th>
            <th className="border-b px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <SummaryRow label="Contas no período" value={`${rowCount}`} />
          <SummaryRow label="Saldo inicial" value={formatBRL(totals.saldo_inicial)} />
          <SummaryRow
            label="Entradas"
            value={formatBRL(totals.entradas)}
            valueClass="text-success"
          />
          <SummaryRow
            label="Saídas"
            value={formatBRL(totals.saidas)}
            valueClass="text-destructive"
          />
          <SummaryRow
            label="Saldo atual"
            value={formatBRL(totals.saldo_atual)}
            bold
          />
        </tbody>
      </table>
    </div>
  )
}

interface SummaryRowProps {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}

function SummaryRow({
  label,
  value,
  bold,
  valueClass,
}: SummaryRowProps): React.ReactElement {
  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-2.5">{label}</td>
      <td
        className={`px-4 py-2.5 text-right tabular-nums ${
          bold ? 'font-semibold' : ''
        } ${valueClass ?? ''}`}
      >
        {value}
      </td>
    </tr>
  )
}
