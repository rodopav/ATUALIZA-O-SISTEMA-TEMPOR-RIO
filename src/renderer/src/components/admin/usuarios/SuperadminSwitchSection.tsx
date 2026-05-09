import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { Switch } from '../../ui/switch'
import { Label } from '../../ui/label'
import { useToast } from '../../ui/use-toast'
import {
  adminUsersApi,
  adminUsersKeys,
  type IamUser,
} from '../../../lib/admin-users-api'
import { useAuthStore } from '../../../lib/auth-store'

interface SuperadminSwitchSectionProps {
  user: IamUser
}

/**
 * Toggle do flag `is_superadmin`. Concede acesso ao app IAM e bypass total
 * em todos os módulos. NUNCA permite revogar a si mesmo (validação extra
 * tanto no client quanto na Edge Function).
 */
export function SuperadminSwitchSection({
  user,
}: SuperadminSwitchSectionProps): React.ReactElement {
  const qc = useQueryClient()
  const { toast } = useToast()
  const myProfile = useAuthStore((s) => s.profile)
  const isSelf = myProfile?.id === user.id
  const initial = user.profile?.is_superadmin ?? false
  const [checked, setChecked] = React.useState(initial)

  React.useEffect(() => {
    setChecked(user.profile?.is_superadmin ?? false)
  }, [user.profile?.is_superadmin])

  const mutation = useMutation({
    mutationFn: (value: boolean) =>
      adminUsersApi.setSuperadmin({ id: user.id, value }),
    onSuccess: (_data, value) => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all })
      toast({
        title: value
          ? 'Superadmin concedido'
          : 'Superadmin revogado',
        variant: 'success',
      })
    },
    onError: (err: Error) => {
      setChecked((c) => !c)
      toast({
        title: 'Falha ao atualizar Superadmin',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const handle = (next: boolean): void => {
    if (isSelf && next === false) {
      toast({
        title: 'Operação bloqueada',
        description: 'Você não pode revogar seu próprio acesso de Superadmin.',
        variant: 'destructive',
      })
      return
    }
    setChecked(next)
    mutation.mutate(next)
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pur-600/15 text-pur-600">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <Label htmlFor="eu-superadmin" className="font-semibold text-pur-600">
              Superadmin (IAM)
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Acesso ao app IAM (gestão de usuários) + bypass de todos os módulos
              do financeiro. Só conceda a quem realmente administra a conta.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <Switch
            id="eu-superadmin"
            checked={checked}
            onCheckedChange={handle}
            disabled={mutation.isPending || (isSelf && checked)}
          />
        </div>
      </div>
    </div>
  )
}
