import * as React from 'react'
import { cn } from '../../lib/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const VARIANTS = {
  primary: 'bg-amb-400 text-zinc-950 hover:bg-amb-300 active:bg-amb-500',
  outline: 'border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800/60',
  ghost: 'bg-transparent text-zinc-300 hover:bg-zinc-800/40 hover:text-zinc-100',
  destructive: 'bg-red-500/90 text-zinc-50 hover:bg-red-500',
} as const

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
} as const

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amb-400/70',
          'disabled:cursor-not-allowed disabled:opacity-50',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
