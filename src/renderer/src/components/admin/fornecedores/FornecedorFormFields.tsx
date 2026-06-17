import * as React from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { formatCPF } from '../../../lib/cpf'
import { formatCNPJ } from '../../../lib/cnpj'

export interface FornecedorFormValues {
  tipo: 'PF' | 'PJ'
  documento?: string | null
  nome: string
  ativo: boolean
}

interface FornecedorFormFieldsProps {
  form: UseFormReturn<FornecedorFormValues>
}

export function FornecedorFormFields({
  form,
}: FornecedorFormFieldsProps): React.ReactElement {
  const { register, control, formState, watch } = form
  const tipo = watch('tipo')
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo-select">Tipo *</Label>
          <Controller
            name="tipo"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="tipo-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="documento">{tipo === 'PF' ? 'CPF' : 'CNPJ'}</Label>
          <Controller
            name="documento"
            control={control}
            render={({ field }) => (
              <Input
                id="documento"
                placeholder={
                  tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'
                }
                value={field.value ?? ''}
                maxLength={tipo === 'PF' ? 14 : 18}
                onChange={(e) =>
                  field.onChange(
                    tipo === 'PF'
                      ? formatCPF(e.target.value)
                      : formatCNPJ(e.target.value),
                  )
                }
                onBlur={field.onBlur}
              />
            )}
          />
          {formState.errors.documento ? (
            <p className="text-xs text-destructive">
              {formState.errors.documento.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome">Nome / Razão social *</Label>
        <Input id="nome" autoFocus {...register('nome')} />
        {formState.errors.nome ? (
          <p className="text-xs text-destructive">{formState.errors.nome.message}</p>
        ) : null}
      </div>

      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="ativo-switch">Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Desmarque para deixar o cadastro inativo (some das listas de
                seleção, mas o histórico é preservado).
              </p>
            </div>
            <Switch
              id="ativo-switch"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </div>
        )}
      />
    </div>
  )
}
