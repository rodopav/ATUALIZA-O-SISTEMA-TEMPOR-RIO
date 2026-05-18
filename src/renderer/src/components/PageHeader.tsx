import * as React from 'react'
import { cn } from '../lib/cn'

interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  eyebrow?: React.ReactNode
  className?: string
}

/**
 * Assinatura RODOPAV de página: tracinho amber + caption uppercase
 * tracking-[2px] + h1 extrabold. Combo "industrial-tech" repetido em
 * TODAS as páginas internas pra consistência.
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  eyebrow,
  className,
}: PageHeaderProps): React.ReactElement {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {breadcrumb ? (
          <div className="text-xs text-muted-foreground">{breadcrumb}</div>
        ) : null}
        {eyebrow ? (
          <div className="mb-1.5 flex items-center gap-2">
            <span aria-hidden className="h-px w-6 bg-amb-400" />
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-amb-600 dark:text-amb-400">
              {eyebrow}
            </span>
          </div>
        ) : null}
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-[26px]">
          {title}
        </h1>
        {description ? (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
