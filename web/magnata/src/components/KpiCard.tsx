import * as React from 'react'
import { cn } from '../lib/cn'

type Tom = 'default' | 'success' | 'warning' | 'destructive' | 'info'

const STRIP: Record<Tom, string> = {
  default: 'bg-zinc-500',
  success: 'bg-emerald-500',
  warning: 'bg-amb-400',
  destructive: 'bg-red-500',
  info: 'bg-sky-500',
}
const TINTA: Record<Tom, string> = {
  default: 'bg-zinc-500/10 text-zinc-300',
  success: 'bg-emerald-500/10 text-emerald-400',
  warning: 'bg-amb-400/15 text-amb-400',
  destructive: 'bg-red-500/10 text-red-400',
  info: 'bg-sky-500/10 text-sky-400',
}

interface KpiCardProps {
  label: string
  valor: React.ReactNode
  icone: React.ReactNode
  hint?: React.ReactNode
  tom?: Tom
  loading?: boolean
  onClick?: () => void
}

/**
 * Card responsivo. Em mobile o valor encolhe (text-xl) e usa truncate
 * pra não estourar. Pra valores grandes (>1M), preferir formatBRLCompact.
 */
export function KpiCard({
  label,
  valor,
  icone,
  hint,
  tom = 'default',
  loading,
  onClick,
}: KpiCardProps): React.ReactElement {
  const clickable = Boolean(onClick)
  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cn(
        'card relative overflow-hidden p-3 pt-4 sm:p-4 sm:pt-5 transition-all duration-200',
        clickable && 'cursor-pointer hover:-translate-y-0.5 hover:border-amb-400/40 active:translate-y-0',
      )}
    >
      <div aria-hidden className={cn('absolute inset-x-0 top-0 h-[3px]', STRIP[tom])} />
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[10px] font-bold uppercase leading-tight tracking-[1.2px] text-zinc-400">
          {label}
        </p>
        <div className={cn('flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg', TINTA[tom])}>
          {icone}
        </div>
      </div>
      <div className="mt-2 min-h-[28px] sm:min-h-[36px]">
        {loading ? (
          <div className="h-7 w-24 animate-pulse rounded bg-zinc-800/60" />
        ) : (
          <p className="num-mono truncate text-[20px] sm:text-[24px] xl:text-[26px] font-extrabold leading-none text-zinc-50">
            {valor}
          </p>
        )}
      </div>
      {hint ? <p className="mt-1.5 line-clamp-2 text-[10px] sm:text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  )
}
