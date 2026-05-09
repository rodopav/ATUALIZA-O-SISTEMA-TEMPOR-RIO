import * as React from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { BRLInput } from '../../lancamentos/BRLInput'

export interface SaldoFormShape {
  conta_id: string
  periodo: string
  valor: number
}

export interface SaldoContaOption {
  id: string
  apelido: string
  empresa: string | null
}

export function periodoToInputValue(iso: string): string {
  return iso.slice(0, 7)
}

export function inputValueToPeriodo(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return ''
  return `${value}-01`
}

interface SaldoFormBodyProps {
  form: UseFormReturn<SaldoFormShape>
  contas: SaldoContaOption[]
}

export function SaldoFormBody({
  form,
  contas,
}: SaldoFormBodyProps): React.ReactElement {
  const { control, formState } = form
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="conta-select">Conta *</Label>
        <Controller
          name="conta_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="conta-select">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.apelido}
                    {c.empresa ? ` — ${c.empresa}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {formState.errors.conta_id ? (
          <p className="text-xs text-destructive">
            {formState.errors.conta_id.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="periodo-input">Período *</Label>
          <Controller
            name="periodo"
            control={control}
            render={({ field }) => (
              <Input
                id="periodo-input"
                type="month"
                value={field.value ? periodoToInputValue(field.value) : ''}
                onChange={(e) =>
                  field.onChange(inputValueToPeriodo(e.target.value))
                }
                onBlur={field.onBlur}
              />
            )}
          />
          {formState.errors.periodo ? (
            <p className="text-xs text-destructive">
              {formState.errors.periodo.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor-input">Valor (BRL) *</Label>
          <Controller
            name="valor"
            control={control}
            render={({ field }) => (
              <BRLInput
                id="valor-input"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Aceita valores negativos.
          </p>
        </div>
      </div>
    </>
  )
}
