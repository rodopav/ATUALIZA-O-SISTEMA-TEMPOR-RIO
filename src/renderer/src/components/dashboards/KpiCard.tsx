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

const TONE_RING: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/15 text-warning-foreground dark:text-warning',
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4',
              TONE_RING[tone],
            )}
          >
            {icon}
          </div>
        </div>
        <div className="mt-4 min-h-[40px]">
          {loading ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
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
