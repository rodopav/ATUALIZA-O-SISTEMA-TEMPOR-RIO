import * as React from 'react'
import { ShieldAlert, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Spinner } from '../../ui/spinner'
import { UserAvatar } from './UserAvatar'
import type { IamUser } from '../../../lib/admin-users-api'

interface UserDeleteDialogProps {
  user: IamUser | null
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}

export function UserDeleteDialog({
  user,
  isPending,
  onConfirm,
  onClose,
}: UserDeleteDialogProps): React.ReactElement {
  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Excluir usuário?
          </DialogTitle>
          <DialogDescription>
            Esta ação remove o usuário do Supabase Auth e exclui o perfil
            relacionado em cascata. Os lançamentos do usuário permanecem mas
            ficam sem responsável associado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <UserAvatar name={user?.profile?.nome_completo} size="lg" />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold">
              {user?.profile?.nome_completo}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <Spinner className="text-destructive-foreground" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
