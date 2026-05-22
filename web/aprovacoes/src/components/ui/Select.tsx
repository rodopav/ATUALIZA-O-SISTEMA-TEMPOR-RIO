import * as React from 'react'
import { cn } from '../../lib/cn'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amb-400/60 focus-visible:border-amb-400/60',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100',
        'placeholder:text-zinc-500 resize-y',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amb-400/60 focus-visible:border-amb-400/60',
        className,
      )}
      {...rest}
    />
  ),
)
Textarea.displayName = 'Textarea'
