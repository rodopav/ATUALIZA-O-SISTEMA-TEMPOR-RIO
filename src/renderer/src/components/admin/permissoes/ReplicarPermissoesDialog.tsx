import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Combobox, type ComboboxOption } from '../../ui/combobox'
import { Spinner } from '../../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert'
import { Label } from '../../ui/label'
import { mapError } from '../../../lib/error-mapper'
import { replicarPermissoes } from '../../../lib/permissoes-queries'
import { toast } from '../../ui/use-toast'

interface ReplicarPermissoesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Usuário-alvo (linhas serão criadas/atualizadas pra ele). */
  targetUserId: string
  /** Nome do alvo, só pra exibição. */
  targetUserName: string
  /** Lista de outros usuários candidatos a fonte. */
  candidates: ComboboxOption[]
  onSuccess: () => void
}

export function ReplicarPermissoesDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
  candidates,
  onSuccess,
}: ReplicarPermissoesDialogProps): React.ReactElement {
  const [sourceId, setSourceId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setSourceId(null)
      setError(null)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: async (): Promise<number> => {
      if (!sourceId) throw new Error('Selecione um usuário fonte.')
      return replicarPermissoes(sourceId, targetUserId)
    },
    onSuccess: (count) => {
      toast({
        title: 'Permissões replicadas',
        description:
          count === 0
            ? 'O usuário fonte não tinha permissões cadastradas.'
            : `${count} permissão(ões) copiada(s) para ${targetUserName}.`,
        variant: 'success',
      })
      onSuccess()
      onOpenChange(false)
    },
    onError: (err) => {
      setError(mapError(err).description)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replicar permissões</DialogTitle>
          <DialogDescription>
            Copie a configuração de permissões de outro usuário para{' '}
            <strong>{targetUserName}</strong>. Permissões existentes do alvo que
            também existirem na fonte serão sobrescritas.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Falha ao replicar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="source-user">Usuário fonte</Label>
          <Combobox
            id="source-user"
            value={sourceId}
            onChange={setSourceId}
            options={candidates}
            placeholder="Selecione o usuário fonte..."
            searchPlaceholder="Buscar por nome ou e-mail..."
            emptyMessage="Nenhum usuário disponível."
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              setError(null)
              mutation.mutate()
            }}
            disabled={!sourceId || mutation.isPending}
          >
            {mutation.isPending ? <Spinner /> : null}
            Replicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
