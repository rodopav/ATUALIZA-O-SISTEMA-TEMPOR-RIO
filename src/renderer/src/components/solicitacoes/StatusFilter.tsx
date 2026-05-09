import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Label } from '../ui/label'
import type { SolicitacaoStatus } from '../../lib/solicitacoes-queries'

const ALL_VALUE = '__all__'

interface StatusFilterProps {
  value: SolicitacaoStatus | null
  onChange: (next: SolicitacaoStatus | null) => void
  /** Esconde a opção "TODOS" e exige um status selecionado. */
  required?: boolean
  id?: string
}

const STATUS_OPTIONS: Array<{ value: SolicitacaoStatus; label: string }> = [
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'APROVADA', label: 'Aprovadas' },
  { value: 'REJEITADA', label: 'Rejeitadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
]

export function StatusFilter({
  value,
  onChange,
  required,
  id = 'solicitacoes-status',
}: StatusFilterProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Status</Label>
      <Select
        value={value ?? ALL_VALUE}
        onValueChange={(v) => onChange(v === ALL_VALUE ? null : (v as SolicitacaoStatus))}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!required ? (
            <SelectItem value={ALL_VALUE}>Todos</SelectItem>
          ) : null}
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
