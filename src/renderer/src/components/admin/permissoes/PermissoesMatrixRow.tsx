import * as React from 'react'
import { Switch } from '../../ui/switch'
import { Badge } from '../../ui/badge'
import { tipoContaLabel } from '../contas/ContaFormFields'
import { cn } from '../../../lib/cn'
import type { ContaWithEmpresa } from '../../../lib/admin-queries'

export interface PermissaoState {
  pode_ver: boolean
  pode_lancar: boolean
}

interface PermissoesMatrixRowProps {
  conta: ContaWithEmpresa
  state: PermissaoState
  pending: boolean
  onChange: (next: PermissaoState) => void
}

export function PermissoesMatrixRow({
  conta,
  state,
  pending,
  onChange,
}: PermissoesMatrixRowProps): React.ReactElement {
  // Regra de UX: Ver fica disabled quando Lançar=true (não dá pra tirar Ver
  // mantendo Lançar). Toggling Lançar=true auto-marca Ver=true.
  const verDisabled = state.pode_lancar

  const handleVerToggle = (next: boolean): void => {
    if (verDisabled && !next) return
    onChange({ ...state, pode_ver: next })
  }

  const handleLancarToggle = (next: boolean): void => {
    onChange({
      pode_lancar: next,
      // Lançar implica ver — auto-marca quando true.
      pode_ver: next ? true : state.pode_ver,
    })
  }

  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-muted/40',
        pending && 'opacity-70',
      )}
    >
      <td className="px-4 py-3 pl-6">
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-foreground">
            {conta.apelido}
          </span>
          <span className="text-xs text-muted-foreground">{conta.banco}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {conta.empresa?.razao_social ?? '—'}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{tipoContaLabel(conta.tipo)}</Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center">
          <Switch
            aria-label={`Permitir ver ${conta.apelido}`}
            checked={state.pode_ver}
            disabled={verDisabled}
            onCheckedChange={handleVerToggle}
          />
        </div>
      </td>
      <td className="px-4 py-3 pr-6">
        <div className="flex items-center justify-center">
          <Switch
            aria-label={`Permitir lançar em ${conta.apelido}`}
            checked={state.pode_lancar}
            onCheckedChange={handleLancarToggle}
          />
        </div>
      </td>
    </tr>
  )
}
