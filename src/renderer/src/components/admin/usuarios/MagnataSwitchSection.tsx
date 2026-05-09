import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Crown, Loader2 } from 'lucide-react'
import { Switch } from '../../ui/switch'
import { Label } from '../../ui/label'
import { useToast } from '../../ui/use-toast'
import {
  adminUsersApi,
  adminUsersKeys,
  type IamUser,
} from '../../../lib/admin-users-api'

interface MagnataSwitchSectionProps {
  user: IamUser
}

/**
 * Toggle do flag `is_magnata` no perfil do usuário. Persiste imediatamente
 * via Edge Function `admin-users` action `set-magnata`. Optimistic update
 * mínimo (espera o sucesso para invalidar a query da lista).
 */
export function MagnataSwitchSection({
  user,
}: MagnataSwitchSectionProps): React.ReactElement {
  const qc = useQueryClient()
  const { toast } = useToast()
  const initial = user.profile?.is_magnata ?? false
  const [checked, setChecked] = React.useState(initial)

  React.useEffect(() => {
    setChecked(user.profile?.is_magnata ?? false)
  }, [user.profile?.is_magnata])

  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      adminUsersApi.setMagnata({ id: user.id, value }),
    onSuccess: (_data, value) => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all })
      toast({
        title: value
          ? 'Acesso Magnata concedido'
          : 'Acesso Magnata revogado',
        variant: 'success',
      })
    },
    onError: (err: Error) => {
      // Rollback visual.
      setChecked((c) => !c)
      toast({
        title: 'Falha ao atualizar acesso Magnata',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const handle = (next: boolean): void => {
    setChecked(next)
    mutation.mutate(next)
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amb-400/15 text-amb-500 dark:text-amb-300">
            <Crown className="h-4 w-4" />
          </div>
          <div>
            <Label
              htmlFor="eu-magnata"
              className="font-semibold text-amb-600 dark:text-amb-300"
            >
              Magnata Dashboard
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Acesso exclusivo ao Dashboard Magnata (relatórios executivos do
              grupo).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <Switch
            id="eu-magnata"
            checked={checked}
            onCheckedChange={handle}
            disabled={mutation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
