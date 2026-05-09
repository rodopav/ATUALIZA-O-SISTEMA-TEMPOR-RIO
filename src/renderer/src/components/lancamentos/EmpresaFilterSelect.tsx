import * as React from 'react'
import { Building2 } from 'lucide-react'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import type { Empresa } from '../../lib/queries'

const TODAS = '__todas__'

interface EmpresaFilterSelectProps {
  empresas: Empresa[]
  value: string | null
  onChange: (next: string | null) => void
  disabled?: boolean
}

/**
 * Select isolado para filtragem de contas por empresa dentro do form de
 * lançamento. Default = "Todas as empresas" (`null`). Não persiste valor —
 * o estado de seleção vive em quem renderiza este componente.
 */
export function EmpresaFilterSelect({
  empresas,
  value,
  onChange,
  disabled,
}: EmpresaFilterSelectProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label htmlFor="empresa_filter" className="flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        Empresa
      </Label>
      <Select
        value={value ?? TODAS}
        onValueChange={(v) => onChange(v === TODAS ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger id="empresa_filter">
          <SelectValue placeholder="Todas as empresas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas as empresas</SelectItem>
          {empresas.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.nome_fantasia ?? emp.razao_social}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Filtra as contas de origem e destino abaixo.
      </p>
    </div>
  )
}
