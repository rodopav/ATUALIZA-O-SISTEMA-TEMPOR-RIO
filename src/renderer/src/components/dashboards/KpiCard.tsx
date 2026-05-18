import * as React from 'react'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { cn } from '../../lib/cn'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  loading?: boolean
  hint?: React.ReactNode
  tone?: 'default' | 'success' | 'destructive' | 'warning'
}

/**
 * KPI Card RODOPAV: strip colorida no topo + ícone tintado + valor
 * mono extrabold (mostrador industrial) + label uppercase com tracking
 * largo + hover com sombra amber.
 */

const STRIP: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-zinc-400 dark:bg-zinc-500',
  success: 'bg-emerald-500',
  destructive: 'bg-red-500',
  warning: 'bg-amb-400',
}

const TINTA: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default:
    'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400',
  success:
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  destructive:
    'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  warning: 'bg-amb-400/15 text-amb-600 dark:bg-amb-400/15 dark:text-amb-400',
}

export function KpiCard({
  label,
  value,
  icon,
  loading,
  hint,
  tone = 'default',
}: KpiCardProps): React.ReactElement {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-amb-400/40',
        'hover:shadow-[0_8px_24px_-12px_rgba(245,158,11,0.25)]',
      )}
    >
      {/* Strip colorida no topo */}
      <div aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', STRIP[tone])} />

      <CardContent className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5',
              TINTA[tone],
            )}
          >
            {icon}
          </div>
        </div>
        <div className="mt-3 min-h-[40px]">
          {loading ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <p className="font-mono text-3xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">
              {value}
            </p>
          )}
        </div>
        {hint ? (
          <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}
