import * as React from 'react'
import { Eye, Eraser, Copy } from 'lucide-react'
import { Button } from '../../ui/button'

interface PermissoesToolbarProps {
  disabled: boolean
  hasReplicarCandidates: boolean
  onMarcarTodasVer: () => void
  onLimparTodas: () => void
  onAbrirReplicar: () => void
}

export function PermissoesToolbar({
  disabled,
  hasReplicarCandidates,
  onMarcarTodasVer,
  onLimparTodas,
  onAbrirReplicar,
}: PermissoesToolbarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onMarcarTodasVer}
        disabled={disabled}
      >
        <Eye className="h-4 w-4" />
        Marcar todas como ver
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onLimparTodas}
        disabled={disabled}
      >
        <Eraser className="h-4 w-4" />
        Limpar todas
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onAbrirReplicar}
        disabled={disabled || !hasReplicarCandidates}
      >
        <Copy className="h-4 w-4" />
        Replicar de outro usuário
      </Button>
    </div>
  )
}
