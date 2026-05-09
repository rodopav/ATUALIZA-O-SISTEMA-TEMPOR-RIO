import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ShieldCheck, Crown, Briefcase } from 'lucide-react'
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
import { Separator } from '../../ui/separator'
import { useToast } from '../../ui/use-toast'
import { adminUsersApi, adminUsersKeys } from '../../../lib/admin-users-api'

const createSchema = z.object({
  nome_completo: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['admin_financeiro', 'usuario_financeiro']),
  is_superadmin: z.boolean(),
  is_magnata: z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function UserCreateDialog({ open, onOpenChange }: Props): React.ReactElement {
  const qc = useQueryClient()
  const { toast } = useToast()
  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      nome_completo: '',
      email: '',
      password: '',
      role: 'usuario_financeiro',
      is_superadmin: false,
      is_magnata: false,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CreateForm) => adminUsersApi.create(values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminUsersKeys.all })
      toast({
        title: 'Usuário criado',
        description: 'O usuário já pode fazer login.',
        variant: 'success',
      })
      form.reset()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast({
        title: 'Não foi possível criar',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const handleClose = (next: boolean): void => {
    if (!next) form.reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <form onSubmit={(e) => void form.handleSubmit((v) => mutation.mutate(v))(e)}>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá acesso imediato com a senha definida.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-5 overflow-y-auto py-4 pr-1">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cu-nome">Nome completo *</Label>
                <Input id="cu-nome" {...form.register('nome_completo')} />
                {form.formState.errors.nome_completo ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.nome_completo.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cu-email">E-mail *</Label>
                  <Input
                    id="cu-email"
                    type="email"
                    autoComplete="off"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cu-pass">Senha temporária *</Label>
                  <Input
                    id="cu-pass"
                    type="password"
                    autoComplete="new-password"
                    {...form.register('password')}
                  />
                  {form.formState.errors.password ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cu-role">Perfil financeiro *</Label>
                <Controller
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="cu-role">
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
                <p className="text-[11px] text-muted-foreground">
                  <Briefcase className="mr-1 inline h-3 w-3" />
                  <strong>Admin Financeiro</strong> tem bypass automático em
                  todos os módulos do app financeiro.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Acessos especiais</h3>
                <p className="text-xs text-muted-foreground">
                  Roles transversais aos 3 apps. Você pode editar depois.
                </p>
              </div>

              <Controller
                control={form.control}
                name="is_superadmin"
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-3 rounded-md border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pur-600/15 text-pur-600">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <Label
                          htmlFor="cu-superadmin"
                          className="font-semibold text-pur-600"
                        >
                          Superadmin (IAM)
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Acesso ao app IAM + bypass total.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="cu-superadmin"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="is_magnata"
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-3 rounded-md border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amb-400/15 text-amb-500 dark:text-amb-300">
                        <Crown className="h-4 w-4" />
                      </div>
                      <div>
                        <Label
                          htmlFor="cu-magnata"
                          className="font-semibold text-amb-600 dark:text-amb-300"
                        >
                          Magnata Dashboard
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Acesso ao Dashboard executivo.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="cu-magnata"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
