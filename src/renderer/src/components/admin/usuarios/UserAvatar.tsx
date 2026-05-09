import * as React from 'react'
import { cn } from '../../../lib/cn'

interface UserAvatarProps {
  name: string | null | undefined
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

function initialsFor(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase() || '?'
}

/**
 * Paleta Road Asfaltos para avatares deterministicamente hashados pelo nome.
 * 8 cores cobrindo o espectro do design system para máximo contraste visual.
 */
const HUE_PALETTE = [
  'bg-amb-400/15 text-amb-500 ring-amb-400/25',
  'bg-blu-600/15 text-blu-600 ring-blu-600/25',
  'bg-grn-600/15 text-grn-600 ring-grn-600/25',
  'bg-pur-600/15 text-pur-600 ring-pur-600/25',
  'bg-red-600/15 text-red-600 ring-red-600/25',
  'bg-amb-600/15 text-amb-600 ring-amb-600/25',
  'bg-asf-700/15 text-asf-700 ring-asf-700/25',
  'bg-ink-500/15 text-ink-500 ring-ink-500/25',
]

function hueFor(name: string | null | undefined): string {
  if (!name) return HUE_PALETTE[0] as string
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % HUE_PALETTE.length
  return HUE_PALETTE[idx] as string
}

const SIZE_MAP: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export function UserAvatar({
  name,
  className,
  size = 'md',
}: UserAvatarProps): React.ReactElement {
  const initials = initialsFor(name)
  const hue = hueFor(name)
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold ring-1',
        SIZE_MAP[size],
        hue,
        className,
      )}
      aria-label={name ?? undefined}
    >
      {initials}
    </div>
  )
}
