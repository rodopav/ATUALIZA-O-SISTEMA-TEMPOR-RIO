import * as React from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Textarea } from '../ui/textarea'
import { BRLInput } from '../lancamentos/BRLInput'
import { ContaItemLabel } from '../ContaItemLabel'
import type { ContaSaldo } from '../../lib/contas-saldo-queries'
import type { CentroCusto } from '../../lib/queries'

const ORIGEM_NONE = '__none__'
const CENTRO_NONE = '__none__'

export interface NovaSolicitacaoFormValues {
  valor: number
  conta_destino_id: string
  descricao: string
  conta_origem_sugerida_id: string | null
  centro_custo_id: string | null
}

interface NovaSolicitacaoFieldsProps {
  form: UseFormReturn<NovaSolicitacaoFormValues>
  contasDestino: ContaSaldo[]
  contasOrigemSugerida: ContaSaldo[]
  centrosCusto: CentroCusto[]
  loading: boolean
  isAdmin: boolean
}

export function NovaSolicitacaoFields({
  form,
  contasDestino,
  contasOrigemSugerida,
  centrosCusto,
  loading,
  isAdmin,
}: NovaSolicitacaoFieldsProps): React.ReactElement {
  const { control, register, formState } = form
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="solicitacao_valor">Valor *</Label>
        <Controller
          control={control}
          name="valor"
          render={({ field }) => (
            <BRLInput
              id="solicitacao_valor"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {formState.errors.valor ? (
          <p className="text-xs text-destructive">
            {formState.errors.valor.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="solicitacao_destino">Conta de destino *</Label>
        <Controller
          control={control}
          name="conta_destino_id"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
              disabled={loading}
            >
              <SelectTrigger id="solicitacao_destino">
                <SelectValue placeholder="Selecionar conta…" />
              </SelectTrigger>
              <SelectContent>
                {contasDestino.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {isAdmin
                      ? 'Nenhuma conta disponível.'
                      : 'Você não possui permissão para lançar em nenhuma conta.'}
                  </div>
                ) : null}
                {contasDestino.map((c) => (
                  <SelectItem
                    key={c.conta_id}
                    value={c.conta_id}
                    title={c.empresa ?? undefined}
                  >
                    <ContaItemLabel conta={c} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {formState.errors.conta_destino_id ? (
          <p className="text-xs text-destructive">
            {formState.errors.conta_destino_id.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="solicitacao_descricao">Descrição *</Label>
        <Textarea
          id="solicitacao_descricao"
          rows={3}
          maxLength={500}
          placeholder="Explique para que será o saldo (mín. 5 caracteres)."
          {...register('descricao')}
        />
        {formState.errors.descricao ? (
          <p className="text-xs text-destructive">
            {formState.errors.descricao.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="solicitacao_origem_sugerida">
          Conta de origem sugerida (opcional)
        </Label>
        <Controller
          control={control}
          name="conta_origem_sugerida_id"
          render={({ field }) => (
            <Select
              value={field.value ?? ORIGEM_NONE}
              onValueChange={(v) =>
                field.onChange(v === ORIGEM_NONE ? null : v)
              }
              disabled={loading}
            >
              <SelectTrigger id="solicitacao_origem_sugerida">
                <SelectValue placeholder="Sem sugestão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ORIGEM_NONE}>
                  <span className="text-muted-foreground">
                    Sem sugestão (admin escolhe)
                  </span>
                </SelectItem>
                {contasOrigemSugerida.map((c) => (
                  <SelectItem
                    key={c.conta_id}
                    value={c.conta_id}
                    title={c.empresa ?? undefined}
                  >
                    <ContaItemLabel conta={c} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Apenas uma sugestão. O administrador pode escolher outra conta para a
          transferência.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="solicitacao_centro">Centro de custo (opcional)</Label>
        <Controller
          control={control}
          name="centro_custo_id"
          render={({ field }) => (
            <Select
              value={field.value ?? CENTRO_NONE}
              onValueChange={(v) =>
                field.onChange(v === CENTRO_NONE ? null : v)
              }
              disabled={loading}
            >
              <SelectTrigger id="solicitacao_centro">
                <SelectValue placeholder="Sem centro de custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CENTRO_NONE}>
                  <span className="text-muted-foreground">
                    Sem centro de custo
                  </span>
                </SelectItem>
                {centrosCusto.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </>
  )
}
