import * as React from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Label } from '../ui/label'
import { DatePicker } from '../ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { BRLInput } from './BRLInput'
import { NaturezaSelector } from './NaturezaSelector'
import { FormSection, FieldError } from './FormSection'
import type { TipoOperacao } from '../../lib/queries'
import type { LancamentoFormValues } from './form-types'

interface BasicInfoSectionProps {
  form: UseFormReturn<LancamentoFormValues>
  tiposOperacao: TipoOperacao[]
  isTransferencia: boolean
  disabled?: boolean
}

export function BasicInfoSection({
  form,
  tiposOperacao,
  isTransferencia,
  disabled,
}: BasicInfoSectionProps): React.ReactElement {
  const {
    control,
    formState: { errors },
  } = form

  return (
    <FormSection
      title="Informações básicas"
      description="Quando, qual a natureza e o valor da operação."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="data">Data *</Label>
          <Controller
            control={control}
            name="data"
            render={({ field }) => (
              <DatePicker
                id="data"
                value={field.value}
                onChange={(v) => field.onChange(v ?? '')}
                clearable={false}
                disabled={disabled}
              />
            )}
          />
          <FieldError msg={errors.data?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor">Valor *</Label>
          <Controller
            control={control}
            name="valor"
            render={({ field }) => (
              <BRLInput
                id="valor"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
          <FieldError msg={errors.valor?.message} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo_operacao_id">Tipo de operação *</Label>
          <Controller
            control={control}
            name="tipo_operacao_id"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger id="tipo_operacao_id">
                  <SelectValue placeholder="Selecionar tipo…" />
                </SelectTrigger>
                <SelectContent>
                  {tiposOperacao.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                      {t.is_transferencia ? ' (transferência)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError msg={errors.tipo_operacao_id?.message} />
        </div>

        {!isTransferencia ? (
          <NaturezaSelector control={control} disabled={disabled} />
        ) : null}
      </div>
    </FormSection>
  )
}
