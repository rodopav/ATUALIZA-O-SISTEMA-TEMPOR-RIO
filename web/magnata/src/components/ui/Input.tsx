import * as React from 'react'
import { cn } from '../../lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100',
        'placeholder:text-zinc-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amb-400/60 focus-visible:border-amb-400/60',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  ),
)
Input.displayName = 'Input'
