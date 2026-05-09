import * as React from 'react'
import { X } from 'lucide-react'
import { Input } from './input'
import { cn } from '../../lib/cn'

interface DatePickerProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type'
  > {
  /** ISO date string (YYYY-MM-DD) or empty/null. */
  value: string | null
  onChange: (next: string | null) => void
  min?: string
  max?: string
  clearable?: boolean
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    { value, onChange, min, max, clearable = true, className, disabled, ...rest },
    ref,
  ) => {
    return (
      <div className={cn('relative', className)}>
        <Input
          ref={ref}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          min={min}
          max={max}
          disabled={disabled}
          className={cn(clearable && value ? 'pr-10' : undefined)}
          {...rest}
        />
        {clearable && value && !disabled ? (
          <button
            type="button"
            aria-label="Limpar data"
            onClick={() => onChange(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    )
  },
)
DatePicker.displayName = 'DatePicker'
