import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Database, Key, Globe, Save, Wallet } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Spinner } from './ui/spinner'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { initSupabase } from '../lib/supabase'
import { APP_TITLE } from '../lib/app-mode'

const schema = z.object({
  url: z
    .string()
    .trim()
    .url('Informe a URL completa, ex: https://xyz.supabase.co')
    .refine((v) => v.endsWith('.supabase.co'), {
      message: 'A URL deve terminar com .supabase.co',
    }),
  key: z
    .string()
    .trim()
    .min(20, 'Key deve ter pelo menos 20 caracteres'),
})

type Values = z.infer<typeof schema>

interface ConfigGateProps {
  children: React.ReactNode
}

type State =
  | { kind: 'loading' }
  | { kind: 'configure'; error?: string }
  | { kind: 'ready' }

/**
 * Bootstrap das credenciais do Supabase. No primeiro launch (ou após o store
 * ser limpo) o usuário precisa colar URL + key publishable. Depois de
 * configurar, o app inicia normalmente.
 *
 * Por que rodar antes do RouterProvider: as queries do TanStack carregam
 * em mount, e o cliente Supabase precisa estar disponível ANTES do primeiro
 * render dos componentes que importam `supabase`.
 */
export function ConfigGate({ children }: ConfigGateProps): React.ReactElement {
  const [state, setState] = React.useState<State>({ kind: 'loading' })

  React.useEffect(() => {
    let cancelled = false
    void window.api.config
      .getSupabase()
      .then((cfg) => {
        if (cancelled) return
        if (cfg.url && cfg.key) {
          try {
            initSupabase(cfg.url, cfg.key)
            setState({ kind: 'ready' })
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro inesperado.'
            setState({ kind: 'configure', error: msg })
          }
        } else {
          setState({ kind: 'configure' })
        }
      })
      .catch((err) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Erro inesperado.'
        setState({ kind: 'configure', error: msg })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          Carregando configuração…
        </div>
      </div>
    )
  }

  if (state.kind === 'configure') {
    return (
      <ConfigureScreen
        initialError={state.error}
        onSaved={() => setState({ kind: 'ready' })}
      />
    )
  }

  return <>{children}</>
}

interface ConfigureScreenProps {
  initialError?: string
  onSaved: () => void
}

function ConfigureScreen({
  initialError,
  onSaved,
}: ConfigureScreenProps): React.ReactElement {
  const [submitError, setSubmitError] = React.useState<string | null>(
    initialError ?? null,
  )

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', key: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      // Valida tentando inicializar (cria o client; se URL/key forem inválidos
      // o erro só aparece na primeira chamada, mas createClient já valida URL).
      initSupabase(values.url, values.key)
      await window.api.config.setSupabase({
        url: values.url,
        key: values.key,
      })
      onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado.'
      setSubmitError(msg)
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Configuração inicial
          </h1>
          <p className="text-sm text-muted-foreground">
            {APP_TITLE} precisa das credenciais do servidor para funcionar.
            Cole abaixo a URL e a chave publishable. Quem fornece isso é o
            Admin de TI.
          </p>
        </header>

        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível conectar</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cfg-url" className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> URL do servidor (Supabase)
            </Label>
            <Input
              id="cfg-url"
              autoFocus
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              autoComplete="off"
              spellCheck={false}
              {...form.register('url')}
            />
            {form.formState.errors.url ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.url.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cfg-key" className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5" /> Publishable key
            </Label>
            <Input
              id="cfg-key"
              type="password"
              placeholder="sb_publishable_..."
              autoComplete="off"
              spellCheck={false}
              {...form.register('key')}
            />
            <p className="text-[11px] text-muted-foreground">
              Esta chave é segura para clientes (nunca use a service_role aqui).
              Ela é armazenada criptografada via OS keychain.
            </p>
            {form.formState.errors.key ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.key.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Spinner className="text-primary-foreground" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar e iniciar
          </Button>
        </form>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Database className="h-3 w-3" />
          A configuração fica guardada neste computador. Para resetar, peça
          ajuda ao TI.
        </p>
      </div>
    </div>
  )
}
