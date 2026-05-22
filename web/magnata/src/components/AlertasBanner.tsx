import * as React from 'react'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { MagnataAlerta } from '../lib/queries'
import { cn } from '../lib/cn'

interface AlertasBannerProps {
  alertas: MagnataAlerta[]
}

const ICONE = {
  CRITICA: AlertCircle,
  AVISO: AlertTriangle,
  INFO: Info,
}

const TINTA = {
  CRITICA: 'border-red-500/40 bg-red-500/10 text-red-100',
  AVISO: 'border-amb-400/40 bg-amb-400/10 text-amb-100',
  INFO: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
}

export function AlertasBanner({ alertas }: AlertasBannerProps): React.ReactElement | null {
  if (alertas.length === 0) return null
  // Ordem: crítica > aviso > info
  const ordered = [...alertas].sort((a, b) => {
    const order = { CRITICA: 0, AVISO: 1, INFO: 2 } as const
    return order[a.severidade] - order[b.severidade]
  })

  return (
    <div className="space-y-2">
      {ordered.map((al, i) => {
        const Icon = ICONE[al.severidade]
        return (
          <div
            key={`${al.tipo}-${i}`}
            className={cn('flex items-start gap-3 rounded-lg border px-4 py-3', TINTA[al.severidade])}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{al.titulo}</p>
              <p className="text-xs opacity-80">{al.descricao}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
