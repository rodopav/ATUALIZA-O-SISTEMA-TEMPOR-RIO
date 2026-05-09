import * as React from 'react'
import type { ControllerRenderProps } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { ContaItemLabel } from '../ContaItemLabel'
import type { ContaSaldo } from '../../lib/contas-saldo-queries'
import type { LancamentoFormValues } from './form-types'

interface ContaSelectFieldProps {
  field:
    | ControllerRenderProps<LancamentoFormValues, 'conta_origem_id'>
    | ControllerRenderProps<LancamentoFormValues, 'conta_destino_id'>
  inputId: string
  options: ContaSaldo[]
  filteredContas: ContaSaldo[]
  selectedEmpresaId: string | null
  disabled?: boolean
}

/**
 * Wrapper que isola o efeito de "auto-reset quando a conta selecionada
 * não pertence à empresa filtrada". Como o efeito vive em um componente
 * próprio, podemos usar React hooks com segurança (sem violar regras
 * dentro de uma render-prop do Controller).
 */
export function ContaSelectField({
  field,
  inputId,
  options,
  filteredContas,
  selectedEmpresaId,
  disabled,
}: ContaSelectFieldProps): React.ReactElement {
  React.useEffect(() => {
    if (!selectedEmpresaId) return
    const current = field.value
    if (!current) return
    const stillBelongs = filteredContas.some((c) => c.conta_id === current)
    if (!stillBelongs) {
      field.onChange(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmpresaId, filteredContas])

  return (
    <Select
      value={field.value ?? undefined}
      onValueChange={(v) => field.onChange(v || null)}
      disabled={disabled}
    >
      <SelectTrigger id={inputId}>
        <SelectValue placeholder="Selecionar conta..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((c) => (
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
  )
}
