import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Landmark } from 'lucide-react'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { contasFiltroQuery } from '../../lib/filtros-queries'

interface ContaFilterProps {
  value: string | null
  onChange: (id: string | null) => void
  label?: string
  /** Texto da opção "tudo". Default: "Todas as contas". */
  placeholder?: string
}

/**
 * Dropdown de conta bancária respeitando RLS (pode_ver_conta).
 * Usuário comum só vê suas contas; admin vê todas.
 */
export function ContaFilter({
  value,
  onChange,
  label = 'Banco / Conta',
  placeholder = 'Todas as contas',
}: ContaFilterProps): React.ReactElement {
  const contasQ = useQuery(contasFiltroQuery)
  const opts = contasQ.data ?? []

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Select
        value={value ?? '__all__'}
        onValueChange={(v) => onChange(v === '__all__' ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {opts.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.apelido}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
