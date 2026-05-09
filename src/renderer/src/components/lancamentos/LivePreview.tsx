import * as React from 'react'
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Receipt,
} from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { formatBRL, formatDate } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { ContaBancaria, TipoOperacao } from '../../lib/queries'
import type { LancamentoFormValues } from './form-types'

interface LivePreviewProps {
  values: LancamentoFormValues
  contas: ContaBancaria[]
  tiposOperacao: TipoOperacao[]
}

function findApelido(contas: ContaBancaria[], id: string | null): string | null {
  if (!id) return null
  return contas.find((c) => c.id === id)?.apelido ?? null
}

export function LivePreview({
  values,
  contas,
  tiposOperacao,
}: LivePreviewProps): React.ReactElement {
  const tipo = tiposOperacao.find((t) => t.id === values.tipo_operacao_id)
  const isTransferencia = tipo?.is_transferencia ?? false
  const origem = findApelido(contas, values.conta_origem_id)
  const destino = findApelido(contas, values.conta_destino_id)
  const valor = values.valor

  const showDebit =
    (values.natureza === 'SAIDA' || isTransferencia) && origem
  const showCredit =
    (values.natureza === 'ENTRADA' || isTransferencia) && destino
  const empty = !showDebit && !showCredit

  return (
    <Card className="sticky top-24 overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Resumo da operação
        </p>
        {isTransferencia ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-blu-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blu-600">
            <ArrowRightLeft className="h-3 w-3" />
            Transferência
          </span>
        ) : null}
      </div>

      <CardContent className="space-y-4 p-5">
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-8 text-center">
            <Receipt className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Pré-visualização vazia
            </p>
            <p className="max-w-[220px] text-xs text-muted-foreground">
              Preencha valor e conta(s) para visualizar a operação.
            </p>
          </div>
        ) : null}

        {showDebit ? (
          <PreviewRow
            tone="debit"
            icon={<ArrowUpRight className="h-4 w-4" />}
            label="Debitar"
            account={origem}
            value={valor}
          />
        ) : null}
        {showCredit ? (
          <PreviewRow
            tone="credit"
            icon={<ArrowDownLeft className="h-4 w-4" />}
            label={isTransferencia ? 'Creditar' : 'Creditar'}
            account={destino}
            value={valor}
          />
        ) : null}

        {values.data ? (
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Data da operação</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatDate(values.data)}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface PreviewRowProps {
  tone: 'debit' | 'credit'
  icon: React.ReactNode
  label: string
  account: string | null
  value: number
}

function PreviewRow({
  tone,
  icon,
  label,
  account,
  value,
}: PreviewRowProps): React.ReactElement {
  const valueClass =
    tone === 'debit' ? 'text-destructive' : 'text-success'
  const ringClass =
    tone === 'debit'
      ? 'bg-destructive/10 text-destructive'
      : 'bg-success/10 text-success'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            ringClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {account ?? '—'}
          </p>
        </div>
      </div>
      <p
        className={cn(
          'pl-10 text-2xl font-semibold tabular-nums',
          valueClass,
        )}
      >
        {formatBRL(value)}
      </p>
    </div>
  )
}
