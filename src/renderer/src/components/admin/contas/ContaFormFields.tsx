import * as React from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
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
import { empresasAdminQuery } from '../../../lib/admin-queries'

export const CONTA_TIPOS = [
  { value: 'CORRENTE', label: 'Conta Corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'CAIXA_FISICO', label: 'Caixa Físico' },
  { value: 'CARTAO_CREDITO_CONTA', label: 'Cartão de Crédito (Conta)' },
] as const

export type ContaTipo = (typeof CONTA_TIPOS)[number]['value']

export const tipoContaLabel = (t: ContaTipo): string =>
  CONTA_TIPOS.find((x) => x.value === t)?.label ?? t

export interface ContaFormValues {
  empresa_id: string
  banco: string
  agencia?: string | null
  numero?: string | null
  apelido: string
  tipo: ContaTipo
  ativo: boolean
  is_caixa_fisico: boolean
}

interface ContaFormFieldsProps {
  form: UseFormReturn<ContaFormValues>
}

export function ContaFormFields({ form }: ContaFormFieldsProps): React.ReactElement {
  const { register, control, formState } = form
  const empresasQ = useQuery(empresasAdminQuery)
  const empresas = (empresasQ.data ?? []).filter((e) => e.ativo)
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="empresa-select">Empresa *</Label>
        <Controller
          name="empresa_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="empresa-select">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {formState.errors.empresa_id ? (
          <p className="text-xs text-destructive">{formState.errors.empresa_id.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="banco">Banco *</Label>
          <Input id="banco" {...register('banco')} />
          {formState.errors.banco ? (
            <p className="text-xs text-destructive">{formState.errors.banco.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="apelido">Apelido *</Label>
          <Input id="apelido" {...register('apelido')} />
          {formState.errors.apelido ? (
            <p className="text-xs text-destructive">{formState.errors.apelido.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="agencia">Agência</Label>
          <Input id="agencia" {...register('agencia')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" {...register('numero')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo-select">Tipo *</Label>
        <Controller
          name="tipo"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => field.onChange(v as ContaTipo)}>
              <SelectTrigger id="tipo-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTA_TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Controller
        name="is_caixa_fisico"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/[0.04] p-3">
            <div>
              <Label htmlFor="caixa-fisico-switch">Caixa físico</Label>
              <p className="text-xs text-muted-foreground">
                Marque se essa conta representa dinheiro em caixa (cofre,
                gaveta, valores físicos). O saldo entra em "Saldo Caixa
                físico" no dashboard e as movimentações ganham selo.
              </p>
            </div>
            <Switch
              id="caixa-fisico-switch"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </div>
        )}
      />

      <Controller
        name="ativo"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="ativo-switch">Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Contas inativas não aparecem em seletores de novos lançamentos.
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
