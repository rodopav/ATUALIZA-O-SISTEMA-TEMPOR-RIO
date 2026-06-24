import * as React from 'react'
import { Card, CardContent } from '../ui/card'
import { Spinner } from '../ui/spinner'
import { FitNumber } from './FitNumber'
import { cn } from '../../lib/cn'

interface StatCardProps {
  label: string
  value: string
  icon?: React.ReactNode
  loading?: boolean
  accent?: 'default' | 'success' | 'destructive' | 'info'
  description?: string
}

/**
 * Card industrial RODOPAV: strip colorida no topo + ícone com tinta de
 * mesma cor + valor mono extrabold (mostrador) + label uppercase
 * tracking-wide + hover com sombra amber e levanta 2px.
 */

const STRIP: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'bg-zinc-400 dark:bg-zinc-500',
  success: 'bg-emerald-500',
  destructive: 'bg-red-500',
  info: 'bg-sky-500',
}

const TINTA: Record<NonNullable<StatCardProps['accent']>, string> = {
  default:
    'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400',
  success:
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  destructive:
    'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  info: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
}

export function StatCard({
  label,
  value,
  icon,
  loading,
  accent = 'default',
  description,
}: StatCardProps): React.ReactElement {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-amb-400/40',
        'hover:shadow-[0_8px_24px_-12px_rgba(245,158,11,0.25)]',
      )}
    >
      {/* Strip colorida no topo — assinatura visual industrial */}
      <div aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', STRIP[accent])} />

      <CardContent className="flex items-start gap-4 p-4 pt-5">
        {icon ? (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              TINTA[accent],
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Spinner size={20} />
          ) : (
            <FitNumber
              maxFontPx={26}
              minFontPx={13}
              className="font-mono font-extrabold tracking-tight text-foreground"
            >
              {value}
            </FitNumber>
          )}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
