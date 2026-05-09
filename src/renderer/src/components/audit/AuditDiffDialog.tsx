import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { AcaoBadge } from './AcaoBadge'
import { JsonDiff } from './JsonDiff'
import type { AuditLogRow } from '../../lib/dashboards-queries'

interface AuditDiffDialogProps {
  row: AuditLogRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTs(ts: string): string {
  try {
    return format(parseISO(ts), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
  } catch {
    return ts
  }
}

export function AuditDiffDialog({
  row,
  open,
  onOpenChange,
}: AuditDiffDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        {row ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AcaoBadge acao={row.acao} />
                <span>{row.entidade}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  #{row.entidade_id.slice(0, 8)}
                </span>
              </DialogTitle>
              <DialogDescription>
                {formatTs(row.ts)}
                {row.usuario?.nome_completo
                  ? ` — ${row.usuario.nome_completo}`
                  : ''}
              </DialogDescription>
            </DialogHeader>

            <JsonDiff
              before={row.valores_antes}
              after={row.valores_depois}
            />

            <div className="grid gap-3 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label="Quando" value={formatTs(row.ts)} />
              <MetaItem
                label="Usuário"
                value={
                  row.usuario?.nome_completo
                    ? `${row.usuario.nome_completo}${
                        row.usuario.email ? ` (${row.usuario.email})` : ''
                      }`
                    : row.usuario_id
                }
              />
              <MetaItem
                label="Motivo"
                value={row.motivo ?? '—'}
                breakWords
              />
              <MetaItem label="IP" value={row.ip ?? '—'} />
              <MetaItem
                label="User Agent"
                value={row.user_agent ?? '—'}
                breakWords
                colSpan
              />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface MetaItemProps {
  label: string
  value: string
  breakWords?: boolean
  colSpan?: boolean
}

function MetaItem({
  label,
  value,
  breakWords,
  colSpan,
}: MetaItemProps): React.ReactElement {
  return (
    <div className={colSpan ? 'sm:col-span-2 lg:col-span-3' : undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <p
        className={
          breakWords
            ? 'text-foreground break-words'
            : 'text-foreground'
        }
      >
        {value}
      </p>
    </div>
  )
}
