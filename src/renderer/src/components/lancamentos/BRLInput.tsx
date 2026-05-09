import * as React from 'react'
import { Input } from '../ui/input'
import { parseBRL } from '../../lib/format'

interface BRLInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (next: number) => void
}

const formatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function format(n: number): string {
  if (!Number.isFinite(n) || n === 0) return ''
  return formatter.format(n)
}

/**
 * Controlled BRL-formatted numeric input. The displayed string mirrors the
 * value while typing, but we re-format only on blur so the user's caret
 * position isn't fought.
 */
export const BRLInput = React.forwardRef<HTMLInputElement, BRLInputProps>(
  ({ value, onChange, onBlur, ...rest }, ref) => {
    const [text, setText] = React.useState<string>(format(value))

    React.useEffect(() => {
      // Sync external resets without thrashing while user is typing.
      const parsed = parseBRL(text)
      if (Math.abs(parsed - value) > 0.001) {
        setText(format(value))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    return (
      <Input
        ref={ref}
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const raw = e.target.value
          setText(raw)
          onChange(parseBRL(raw))
        }}
        onBlur={(e) => {
          setText(format(parseBRL(text)))
          onBlur?.(e)
        }}
        placeholder="0,00"
        {...rest}
      />
    )
  },
)
BRLInput.displayName = 'BRLInput'
