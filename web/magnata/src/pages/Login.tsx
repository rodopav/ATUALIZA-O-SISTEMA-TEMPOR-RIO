import * as React from 'react'
import { Lock, Mail, AlertCircle, Settings } from 'lucide-react'
import { signIn } from '../lib/auth-store'
import { clearConfig, getConfig } from '../lib/config'
import { resetSupabaseClient } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

export function Login(): React.ReactElement {
  const [email, setEmail] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      await signIn(email.trim(), senha)
      // AuthProvider reage e App re-renderiza pro Dashboard
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar'
      setErro(msg.includes('Invalid') ? 'Email ou senha incorretos' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card elevated className="w-full max-w-md overflow-hidden">
        <div className="tarja-amber" />
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-7 flex items-center gap-3">
            <img src="/icon-192.png" alt="Rodopav" className="h-12 w-12 rounded-lg shrink-0" />
            <div className="min-w-0">
              <p className="label-eyebrow">Magnata Rodopav</p>
              <h1 className="text-lg font-bold leading-tight text-zinc-50">Cockpit Executivo</h1>
            </div>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Mail className="mr-1 inline h-3 w-3" /> Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="senha" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Lock className="mr-1 inline h-3 w-3" /> Senha
              </label>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {erro ? (
              <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{erro}</span>
              </div>
            ) : null}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Acesso apenas para usuários com flag <code className="font-mono">is_magnata</code> ativa.
          </p>

          <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-zinc-800/60 pt-3">
            <Settings className="h-3 w-3 text-zinc-600" />
            <button
              type="button"
              onClick={() => {
                if (!confirm('Trocar de conexão Supabase? Você precisará digitar URL+chave de novo.')) return
                clearConfig()
                resetSupabaseClient()
                window.location.reload()
              }}
              className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
            >
              Trocar de conexão · {getConfig()?.url.replace(/^https?:\/\//, '').slice(0, 32) ?? '—'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
