import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Spinner } from '../components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { supabase } from '../lib/supabase'
import { mapError } from '../lib/error-mapper'
import { toast } from '../components/ui/use-toast'

const schema = z
  .object({
    password: z.string().min(8, 'A nova senha deve ter ao menos 8 caracteres.'),
    confirm: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem.',
  })

type FormValues = z.infer<typeof schema>

import { HOME_PATH } from '../lib/app-mode'

export function RedefinirSenhaPage(): React.ReactElement {
  const navigate = useNavigate()
  const [tokenStatus, setTokenStatus] = React.useState<
    'idle' | 'exchanging' | 'ready' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  React.useEffect(() => {
    const off = window.api.onDeepLink((payload) => {
      if (payload.type !== 'reset') return
      setTokenStatus('exchanging')
      supabase.auth
        .exchangeCodeForSession(payload.token)
        .then(({ error }) => {
          if (error) throw error
          setTokenStatus('ready')
        })
        .catch((err: unknown) => {
          const mapped = mapError(err)
          setTokenStatus('error')
          setErrorMessage(mapped.description)
        })
    })
    return () => {
      off()
    }
  }, [])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw error
      toast({
        title: 'Senha atualizada',
        description: 'Sua senha foi redefinida com sucesso.',
      })
      navigate(HOME_PATH, { replace: true })
    } catch (err) {
      const mapped = mapError(err)
      toast({
        title: mapped.title,
        description: mapped.description,
        variant: 'destructive',
      })
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl">Redefinir senha</CardTitle>
          <CardDescription>
            {tokenStatus === 'ready'
              ? 'Defina sua nova senha.'
              : 'Aguardando link de redefinição enviado por e-mail.'}
          </CardDescription>
        </CardHeader>

        {tokenStatus === 'error' && errorMessage ? (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Não foi possível validar o link</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}

        {tokenStatus !== 'ready' && tokenStatus !== 'error' ? (
          <CardContent className="flex justify-center py-8">
            <Spinner size={24} />
          </CardContent>
        ) : null}

        {tokenStatus === 'ready' ? (
          <form onSubmit={onSubmit} noValidate>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Nova senha</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoFocus
                  {...form.register('password')}
                />
                {form.formState.errors.password ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm">Confirmar nova senha</Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  {...form.register('confirm')}
                />
                {form.formState.errors.confirm ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.confirm.message}
                  </p>
                ) : null}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? <Spinner /> : null}
                Salvar nova senha
              </Button>
            </CardFooter>
          </form>
        ) : null}

        <CardFooter className="justify-center">
          <Button
            type="button"
            variant="link"
            className="text-xs"
            onClick={() => navigate('/login', { replace: true })}
          >
            Voltar para login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
