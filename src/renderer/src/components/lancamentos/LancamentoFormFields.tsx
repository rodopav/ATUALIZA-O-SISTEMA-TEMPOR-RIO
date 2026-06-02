import * as React from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Combobox, type ComboboxOption } from '../ui/combobox'
import type {
  CentroCusto,
  ContaBancaria,
  TipoOperacao,
} from '../../lib/queries'
import type { FornecedorCliente } from '../../lib/lancamentos-queries'
import { ContaSelectors } from './ContaSelectors'
import { BasicInfoSection } from './BasicInfoSection'
import { FormSection, FieldError, emptyToNull } from './FormSection'
import type { LancamentoFormValues } from './form-types'

interface LancamentoFormFieldsProps {
  form: UseFormReturn<LancamentoFormValues>
  tiposOperacao: TipoOperacao[]
  contas: ContaBancaria[]
  centrosCusto: CentroCusto[]
  fornecedores: FornecedorCliente[]
  onCreateFornecedor: () => void
  disabled?: boolean
  /**
   * Quando estamos editando um lançamento existente, passa o valor e a
   * conta de origem originais pra UI ajustar a checagem de saldo
   * insuficiente — sem isso o aviso aparece errado em toda edição.
   */
  editing?: { valor: number; contaOrigemId: string | null } | null
}

export function LancamentoFormFields({
  form,
  tiposOperacao,
  contas,
  centrosCusto,
  fornecedores,
  onCreateFornecedor,
  disabled,
  editing,
}: LancamentoFormFieldsProps): React.ReactElement {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form

  const tipoId = watch('tipo_operacao_id')
  const natureza = watch('natureza')
  const values = watch()

  const tipoSelecionado = React.useMemo(
    () => tiposOperacao.find((t) => t.id === tipoId),
    [tipoId, tiposOperacao],
  )
  const isTransferencia = tipoSelecionado?.is_transferencia ?? false
  const showOrigem = isTransferencia || natureza === 'SAIDA'
  const showDestino = isTransferencia || natureza === 'ENTRADA'

  const fornecedorOptions = React.useMemo<ComboboxOption[]>(
    () =>
      fornecedores.map((f) => ({
        value: f.id,
        label: f.nome,
        hint: f.tipo === 'PF' ? 'PF' : 'PJ',
      })),
    [fornecedores],
  )

  return (
    <div className="space-y-8">
      <BasicInfoSection
        form={form}
        tiposOperacao={tiposOperacao}
        isTransferencia={isTransferencia}
        disabled={disabled}
      />

      <FormSection title="Operação" description="Selecione as contas envolvidas.">
        <ContaSelectors
          control={control}
          errors={errors}
          contas={contas}
          showOrigem={showOrigem}
          showDestino={showDestino}
          origemSelected={values.conta_origem_id}
          destinoSelected={values.conta_destino_id}
          disabled={disabled}
          editing={editing}
        />
      </FormSection>

      <FormSection
        title="Categorização"
        description="Centro de custo e contraparte."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="centro_custo_id">Centro de custo *</Label>
            <Controller
              control={control}
              name="centro_custo_id"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="centro_custo_id">
                    <SelectValue placeholder="Selecionar centro…" />
                  </SelectTrigger>
                  <SelectContent>
                    {centrosCusto.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError msg={errors.centro_custo_id?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fornecedor_cliente_id">Fornecedor / cliente</Label>
            <Controller
              control={control}
              name="fornecedor_cliente_id"
              render={({ field }) => (
                <Combobox
                  id="fornecedor_cliente_id"
                  value={field.value}
                  onChange={field.onChange}
                  options={fornecedorOptions}
                  placeholder="Selecionar fornecedor/cliente…"
                  emptyMessage="Nenhum fornecedor encontrado."
                  onCreateNew={onCreateFornecedor}
                  createNewLabel="+ Cadastrar novo"
                  disabled={disabled}
                />
              )}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Detalhes"
        description="Descrição livre, RI e anotações internas."
      >
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição *</Label>
          <Textarea
            id="descricao"
            rows={3}
            {...register('descricao')}
            disabled={disabled}
            placeholder="Descreva a operação para os responsáveis…"
          />
          <FieldError msg={errors.descricao?.message} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ri">RI (opcional)</Label>
            <Input
              id="ri"
              {...register('ri', { setValueAs: emptyToNull })}
              disabled={disabled}
              placeholder="Ex: 2024-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Input
              id="observacoes"
              {...register('observacoes', { setValueAs: emptyToNull })}
              disabled={disabled}
              placeholder="Notas internas…"
            />
          </div>
        </div>
      </FormSection>
    </div>
  )
}
