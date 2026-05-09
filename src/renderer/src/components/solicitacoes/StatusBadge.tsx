import * as React from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import type { SolicitacaoStatus } from '../../lib/solicitacoes-queries'

interface StatusBadgeProps {
  status: SolicitacaoStatus
}

const ICON_BY_STATUS: Record<
  SolicitacaoStatus,
  React.ComponentType<{ className?: string }>
> = {
  PENDENTE: Clock,
  APROVADA: CheckCircle2,
  REJEITADA: XCircle,
  CANCELADA: Ban,
}

const VARIANT_BY_STATUS: Record<
  SolicitacaoStatus,
  'warning' | 'success' | 'destructive' | 'secondary'
> = {
  PENDENTE: 'warning',
  APROVADA: 'success',
  REJEITADA: 'destructive',
  CANCELADA: 'secondary',
}

const LABEL_BY_STATUS: Record<SolicitacaoStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const Icon = ICON_BY_STATUS[status]
  return (
    <Badge variant={VARIANT_BY_STATUS[status]}>
      <Icon className="h-3 w-3" />
      {LABEL_BY_STATUS[status]}
    </Badge>
  )
}
