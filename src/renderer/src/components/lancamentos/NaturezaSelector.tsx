import * as React from 'react'
import { Controller, type Control } from 'react-hook-form'
import { Label } from '../ui/label'
import { cn } from '../../lib/cn'
import type { LancamentoFormValues } from './form-types'

interface NaturezaSelectorProps {
  control: Control<LancamentoFormValues>
  disabled?: boolean
}

export function NaturezaSelector({
  control,
  disabled,
}: NaturezaSelectorProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label>Natureza *</Label>
      <Controller
        control={control}
        name="natureza"
        render={({ field }) => (
          <div className="flex gap-2">
            <NaturezaButton
              active={field.value === 'ENTRADA'}
              onClick={() => field.onChange('ENTRADA')}
              disabled={disabled}
              variant="entrada"
            >
              Entrada
            </NaturezaButton>
            <NaturezaButton
              active={field.value === 'SAIDA'}
              onClick={() => field.onChange('SAIDA')}
              disabled={disabled}
              variant="saida"
            >
              Saída
            </NaturezaButton>
          </div>
        )}
      />
    </div>
  )
}

interface NaturezaButtonProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  variant: 'entrada' | 'saida'
  children: React.ReactNode
}

function NaturezaButton({
  active,
  onClick,
  disabled,
  variant,
  children,
}: NaturezaButtonProps): React.ReactElement {
  const activeClass =
    variant === 'entrada'
      ? 'bg-success text-success-foreground border-success hover:bg-success/90'
      : 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active ? activeClass : 'border-input bg-background hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}
