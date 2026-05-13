import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react'
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
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert'
import { useToast } from '../../ui/use-toast'
import { adminUsersApi, type IamUser } from '../../../lib/admin-users-api'

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres.'),
    confirm: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem.',
  })

type FormValues = z.infer<typeof schema>

interface SetPasswordDialogProps {
  user: IamUser | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

/**
 * Define uma nova senha pro usuário SEM enviar email.
 * O usuário consegue logar com a nova senha imediatamente.
 */
export function SetPasswordDialog({
  user,
  open,
  onOpenChange,
}: SetPasswordDialogProps): React.ReactElement | null {
  const { toast } = useToast()
  const [showPwd, setShowPwd] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset({ password: '', confirm: '' })
      setShowPwd(false)
    }
  }, [open, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user) throw new Error('Usuário inválido.')
      return adminUsersApi.setPassword({
        id: user.id,
        password: values.password,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Senha redefinida',
        description: `${user?.profile?.nome_completo ?? user?.email} já pode logar com a nova senha.`,
        variant: 'success',
      })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast({
        title: 'Falha ao redefinir senha',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void form.handleSubmit((v) => mutation.mutate(v))(e)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-pur-600" />
              Definir nova senha
            </DialogTitle>
            <DialogDescription>
              {user.profile?.nome_completo ?? user.email} — a senha vai ser
              alterada imediatamente, sem envio de email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Compartilhe por canal seguro</AlertTitle>
              <AlertDescription>
                Anote ou envie a senha pelo Chat interno do sistema. Sessões
                ativas do usuário continuam válidas até o próximo logout.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="sp-pwd">Nova senha *</Label>
              <div className="relative">
                <Input
                  id="sp-pwd"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  spellCheck={false}
                  {...form.register('password')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sp-confirm">Confirmar nova senha *</Label>
              <Input
                id="sp-confirm"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                spellCheck={false}
                {...form.register('confirm')}
              />
              {form.formState.errors.confirm ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.confirm.message}
                </p>
              ) : null}
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Redefinir senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
