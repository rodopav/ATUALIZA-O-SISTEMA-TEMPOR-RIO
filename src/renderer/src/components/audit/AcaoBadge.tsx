import * as React from 'react'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/cn'
import type { AcaoAudit } from '../../lib/dashboards-queries'

interface AcaoBadgeProps {
  acao: AcaoAudit
  className?: string
}

interface AcaoSpec {
  label: string
  className: string
}

const SPECS: Record<AcaoAudit, AcaoSpec> = {
  CREATE: {
    label: 'CRIAR',
    className: 'bg-grn-50 text-grn-600 border-grn-600/20',
  },
  UPDATE: {
    label: 'ATUALIZAR',
    className: 'bg-blu-50 text-blu-600 border-blu-600/20',
  },
  DELETE: {
    label: 'EXCLUIR',
    className: 'bg-red-50 text-red-600 border-red-600/20',
  },
  LOCK: {
    label: 'FECHAR',
    className: 'bg-amb-100 text-amb-600 border-amb-400/30',
  },
  UNLOCK: {
    label: 'REABRIR',
    className: 'bg-amb-100 text-amb-600 border-amb-400/30',
  },
  APPROVE: {
    label: 'APROVAR',
    className: 'bg-grn-50 text-grn-600 border-grn-600/20',
  },
  REJECT: {
    label: 'REJEITAR',
    className: 'bg-red-50 text-red-600 border-red-600/20',
  },
  OVERRIDE: {
    label: 'OVERRIDE',
    className: 'bg-pur-50 text-pur-600 border-pur-600/20',
  },
}

export function AcaoBadge({
  acao,
  className,
}: AcaoBadgeProps): React.ReactElement {
  const spec = SPECS[acao]
  return (
    <Badge variant="outline" className={cn(spec.className, className)}>
      {spec.label}
    </Badge>
  )
}
