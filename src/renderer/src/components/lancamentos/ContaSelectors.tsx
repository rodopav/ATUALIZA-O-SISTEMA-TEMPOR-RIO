import * as React from 'react'
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
} from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Label } from '../ui/label'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { formatBRL } from '../../lib/format'
import { contasSaldoQuery } from '../../lib/contas-saldo-queries'
import { empresasQuery, type ContaBancaria } from '../../lib/queries'
import { EmpresaFilterSelect } from './EmpresaFilterSelect'
import { ContaSelectField } from './ContaSelectField'
import type { LancamentoFormValues } from './form-types'

interface ContaSelectorsProps {
  control: Control<LancamentoFormValues>
  errors: FieldErrors<LancamentoFormValues>
  /**
   * Mantido por compatibilidade com `LancamentoFormFields`. A lista efetiva
   * usada vem de `v_contas_saldo` via TanStack Query — ela já traz o saldo
   * embutido e respeita as RLS de `contas_bancarias`.
   */
  contas: ContaBancaria[]
  showOrigem: boolean
  showDestino: boolean
  origemSelected: string | null
  destinoSelected: string | null
  disabled?: boolean
}

export function ContaSelectors({
  control,
  errors,
  showOrigem,
  showDestino,
  origemSelected,
  destinoSelected,
  disabled,
}: ContaSelectorsProps): React.ReactElement {
  const contasSaldoQ = useQuery(contasSaldoQuery)
  const empresasQ = useQuery(empresasQuery)
  const contas = contasSaldoQ.data ?? []
  const empresas = empresasQ.data ?? []

  const [selectedEmpresaId, setSelectedEmpresaId] =
    React.useState<string | null>(null)

  const filteredContas = React.useMemo(
    () =>
      contas.filter(
        (c) => !selectedEmpresaId || c.empresa_id === selectedEmpresaId,
      ),
    [contas, selectedEmpresaId],
  )

  const valor = useWatch({ control, name: 'valor' })
  const natureza = useWatch({ control, name: 'natureza' })

  const origemOptions = React.useMemo(
    () => filteredContas.filter((c) => c.conta_id !== destinoSelected),
    [filteredContas, destinoSelected],
  )
  const destinoOptions = React.useMemo(
    () => filteredContas.filter((c) => c.conta_id !== origemSelected),
    [filteredContas, origemSelected],
  )

  const origemConta = React.useMemo(
    () => contas.find((c) => c.conta_id === origemSelected) ?? null,
    [contas, origemSelected],
  )
  const destinoConta = React.useMemo(
    () => contas.find((c) => c.conta_id === destinoSelected) ?? null,
    [contas, destinoSelected],
  )

  const isTransferencia = showOrigem && showDestino
  const showInsufficientWarning =
    showOrigem &&
    !!origemConta &&
    origemConta.tipo !== 'CARTAO_CREDITO_CONTA' &&
    typeof valor === 'number' &&
    valor > 0 &&
    valor > origemConta.saldo_atual &&
    (natureza === 'SAIDA' || isTransferencia)

  return (
    <div className="space-y-4">
      <EmpresaFilterSelect
        empresas={empresas}
        value={selectedEmpresaId}
        onChange={setSelectedEmpresaId}
        disabled={disabled}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {showOrigem ? (
          <div className="space-y-2">
            <Label htmlFor="conta_origem_id">Conta de origem *</Label>
            <Controller
              control={control}
              name="conta_origem_id"
              render={({ field }) => (
                <ContaSelectField
                  field={field}
                  inputId="conta_origem_id"
                  options={origemOptions}
                  filteredContas={filteredContas}
                  selectedEmpresaId={selectedEmpresaId}
                  disabled={disabled}
                />
              )}
            />
            {errors.conta_origem_id?.message ? (
              <p className="text-xs text-destructive">
                {errors.conta_origem_id.message}
              </p>
            ) : null}
            {origemConta?.empresa ? (
              <p className="text-xs text-muted-foreground">
                {origemConta.empresa}
              </p>
            ) : null}
            {showInsufficientWarning && origemConta ? (
              <Alert variant="warning" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Saldo insuficiente previsto</AlertTitle>
                <AlertDescription>
                  Atenção: este valor é maior que o saldo atual da conta (
                  <span className="font-semibold tabular-nums">
                    {formatBRL(origemConta.saldo_atual)}
                  </span>
                  ). O sistema bloqueará o lançamento.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {showDestino ? (
          <div className="space-y-2">
            <Label htmlFor="conta_destino_id">Conta de destino *</Label>
            <Controller
              control={control}
              name="conta_destino_id"
              render={({ field }) => (
                <ContaSelectField
                  field={field}
                  inputId="conta_destino_id"
                  options={destinoOptions}
                  filteredContas={filteredContas}
                  selectedEmpresaId={selectedEmpresaId}
                  disabled={disabled}
                />
              )}
            />
            {errors.conta_destino_id?.message ? (
              <p className="text-xs text-destructive">
                {errors.conta_destino_id.message}
              </p>
            ) : null}
            {destinoConta?.empresa ? (
              <p className="text-xs text-muted-foreground">
                {destinoConta.empresa}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
