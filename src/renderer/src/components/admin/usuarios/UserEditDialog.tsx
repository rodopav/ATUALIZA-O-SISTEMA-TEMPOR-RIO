import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { useToast } from '../../ui/use-toast'
import { Separator } from '../../ui/separator'
import {
  adminUsersApi,
  adminUsersKeys,
  type IamUser,
} from '../../../lib/admin-users-api'
import { MagnataSwitchSection } from './MagnataSwitchSection'
import { SuperadminSwitchSection } from './SuperadminSwitchSection'
import { ModulosMatrixSection } from './ModulosMatrixSection'

const editSchema = z.object({
  nome_completo: z.string().min(3, 'Nome muito curto'),
  role: z.enum(['admin_financeiro', 'usuario_financeiro']),
  ativo: z.boolean(),
})
type EditForm = z.infer<typeof editSchema>

interface Props {
  open: boolean
  user: IamUser | null
  onOpenChange: (v: boolean) => void
}

export function UserEditDialog({
  open,
  user,
  onOpenChange,
}: Props): React.ReactElement | null {
  const qc = useQueryClient()
  const { toast } = useToast()
  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nome_completo: '',
      role: 'usuario_financeiro',
      ativo: true,
    },
  })

  React.useEffect(() => {
    if (user && user.profile) {
      form.reset({
        nome_completo: user.profile.nome_completo,
        role: user.profile.role,
        ativo: user.profile.ativo,
      })
    }
  }, [user, form])

  const mutation = useMutation({
    mutationFn: (values: EditForm) =>
      adminUsersApi.update({ id: user!.id, ...values }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all })
      toast({ title: 'Usuário atualizado' })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível atualizar',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <form
            id="user-edit-form"
            onSubmit={(e) =>
              void form.handleSubmit((v) => mutation.mutate(v))(e)
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="eu-nome">Nome completo *</Label>
              <Input id="eu-nome" {...form.register('nome_completo')} />
              {form.formState.errors.nome_completo ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nome_completo.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="eu-role">Perfil *</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="eu-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usuario_financeiro">
                        Usuário Financeiro
                      </SelectItem>
                      <SelectItem value="admin_financeiro">
                        Admin Financeiro
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="eu-ativo">Ativo</Label>
                    <p className="text-xs text-muted-foreground">
                      Usuários inativos não conseguem acessar o sistema.
                    </p>
                  </div>
                  <Switch
                    id="eu-ativo"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </form>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Acessos especiais</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Roles transversais aos 3 apps (Financeiro / IAM / Magnata).
              Independentes do perfil acima.
            </p>
            <div className="space-y-2">
              <SuperadminSwitchSection user={user} />
              <MagnataSwitchSection user={user} />
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Módulos do sistema</h3>
            <ModulosMatrixSection user={user} />
          </div>
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
            type="submit"
            form="user-edit-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Salvar dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
