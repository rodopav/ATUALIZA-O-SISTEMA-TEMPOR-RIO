import * as React from 'react'
import { Card, CardContent } from '../ui/card'
import { Spinner } from '../ui/spinner'
import { cn } from '../../lib/cn'

interface StatCardProps {
  label: string
  value: string
  icon?: React.ReactNode
  loading?: boolean
  accent?: 'default' | 'success' | 'destructive' | 'info'
  description?: string
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  destructive: 'text-destructive',
  info: 'text-blu-600',
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
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        {icon ? (
          <div
            className={cn(
              'rounded-md bg-muted p-2',
              accent === 'success' && 'text-success',
              accent === 'destructive' && 'text-destructive',
              accent === 'info' && 'text-blu-600',
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Spinner size={20} />
          ) : (
            <p
              className={cn(
                'text-2xl font-bold tabular-nums',
                ACCENT_CLASSES[accent],
              )}
            >
              {value}
            </p>
          )}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
