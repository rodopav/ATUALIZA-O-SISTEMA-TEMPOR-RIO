import * as React from 'react'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { cn } from '../../lib/cn'
import type { MagnataAlerta } from '../../lib/magnata-queries'

interface AlertasBannerProps {
  alertas: MagnataAlerta[]
}

interface SeveridadeStyle {
  card: string
  iconBox: string
  iconColor: string
  label: string
  labelColor: string
  icon: React.ComponentType<{ className?: string }>
}

const SEVERIDADE_STYLES: Record<MagnataAlerta['severidade'], SeveridadeStyle> = {
  CRITICA: {
    card: 'border-destructive/40 bg-destructive/5',
    iconBox: 'bg-destructive/10',
    iconColor: 'text-destructive',
    label: 'CRÍTICA',
    labelColor: 'text-destructive',
    icon: AlertCircle,
  },
  AVISO: {
    card: 'border-amb-400/40 bg-card',
    iconBox: 'bg-amb-400/15',
    iconColor: 'text-amb-500 dark:text-amb-300',
    label: 'AVISO',
    labelColor: 'text-amb-600 dark:text-amb-300',
    icon: AlertTriangle,
  },
  INFO: {
    card: 'border-blu-600/30 bg-card',
    iconBox: 'bg-blu-600/10',
    iconColor: 'text-blu-600 dark:text-blu-50',
    label: 'INFO',
    labelColor: 'text-blu-600 dark:text-blu-50',
    icon: Info,
  },
}

export function AlertasBanner({
  alertas,
}: AlertasBannerProps): React.ReactElement | null {
  if (alertas.length === 0) return null

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {alertas.map((alerta, idx) => {
        const style = SEVERIDADE_STYLES[alerta.severidade]
        const Icon = style.icon
        return (
          <Card
            key={`${alerta.tipo}-${idx}`}
            className={cn('border', style.card)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    style.iconBox,
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', style.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider',
                      style.labelColor,
                    )}
                  >
                    {style.label}
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-foreground">
                    {alerta.titulo}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {alerta.descricao}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
