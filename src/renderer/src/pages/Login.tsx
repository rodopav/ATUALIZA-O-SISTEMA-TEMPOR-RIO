import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Wallet, Mail, Lock, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Spinner } from '../components/ui/spinner'
import { useAuthStore } from '../lib/auth-store'
import { supabase } from '../lib/supabase'
import { mapError } from '../lib/error-mapper'
import { toast } from '../components/ui/use-toast'
import { BrandPanel } from '../components/login/BrandPanel'
import { FieldGroup } from '../components/login/FieldGroup'

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
type LoginValues = z.infer<typeof loginSchema>

const recoverySchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
})
type RecoveryValues = z.infer<typeof recoverySchema>

import { APP_MODE, HOME_PATH, APP_TITLE } from '../lib/app-mode'

const BRAND_TITLE =
  APP_MODE === 'magnata' ? 'Magnata Dashboard · Rodopav' : APP_TITLE

export function LoginPage(): React.ReactElement {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const [mode, setMode] = React.useState<'login' | 'recover'>('login')

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const recoveryForm = useForm<RecoveryValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: '' },
  })

  const onLoginSubmit = loginForm.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
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

  const onRecoverySubmit = recoveryForm.handleSubmit(async (values) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: 'rodofin://reset',
      })
      if (error) throw error
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      })
      setMode('login')
    } catch (err) {
      const mapped = mapError(err)
      toast({
        title: mapped.title,
        description: mapped.description,
        variant: 'destructive',
      })
    }
  })

  const submitting =
    loading ||
    loginForm.formState.isSubmitting ||
    recoveryForm.formState.isSubmitting

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <BrandPanel title={BRAND_TITLE} />

      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-8">
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground md:hidden">
              <Wallet className="h-4 w-4" />
              <span>Rodopav</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {mode === 'login' ? 'Entrar' : 'Recuperar acesso'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Acesse sua conta de tesouraria.'
                : 'Informe seu e-mail e enviaremos um link para redefinir a senha.'}
            </p>
          </header>

          {mode === 'login' ? (
            <form onSubmit={onLoginSubmit} noValidate className="space-y-5">
              <FieldGroup
                id="login-email"
                label="E-mail"
                error={loginForm.formState.errors.email?.message}
                icon={<Mail className="h-4 w-4" />}
              >
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="seu@email.com"
                  className="pl-9"
                  {...loginForm.register('email')}
                />
              </FieldGroup>

              <FieldGroup
                id="login-password"
                label="Senha"
                error={loginForm.formState.errors.password?.message}
                icon={<Lock className="h-4 w-4" />}
              >
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...loginForm.register('password')}
                />
              </FieldGroup>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner className="text-primary-foreground" />
                    Entrando…
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('recover')}
                  disabled={submitting}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={onRecoverySubmit} noValidate className="space-y-5">
              <FieldGroup
                id="recover-email"
                label="E-mail"
                error={recoveryForm.formState.errors.email?.message}
                icon={<Mail className="h-4 w-4" />}
              >
                <Input
                  id="recover-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="seu@email.com"
                  className="pl-9"
                  {...recoveryForm.register('email')}
                />
              </FieldGroup>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner className="text-primary-foreground" />
                    Enviando…
                  </>
                ) : (
                  'Enviar link de recuperação'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setMode('login')}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para login
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
