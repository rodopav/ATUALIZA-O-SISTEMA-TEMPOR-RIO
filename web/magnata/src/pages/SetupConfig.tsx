import * as React from 'react'
import { Database, Key, Link2, AlertCircle, ExternalLink } from 'lucide-react'
import {
  saveConfig,
  isValidSupabaseUrl,
  isValidAnonKey,
  getConfig,
} from '../lib/config'
import { resetSupabaseClient } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

interface SetupConfigProps {
  onSaved: () => void
}

export function SetupConfig({ onSaved }: SetupConfigProps): React.ReactElement {
  const existing = getConfig()
  const [url, setUrl] = React.useState(existing?.url ?? '')
  const [key, setKey] = React.useState(existing?.anonKey ?? '')
  const [erro, setErro] = React.useState<string | null>(null)

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    setErro(null)
    const cleanUrl = url.trim().replace(/\/$/, '')
    const cleanKey = key.trim()
    if (!isValidSupabaseUrl(cleanUrl)) {
      setErro('URL inválida. Formato esperado: https://xxxx.supabase.co')
      return
    }
    if (!isValidAnonKey(cleanKey)) {
      setErro('Chave inválida. Cole a "anon public" key (JWT começando com eyJ)')
      return
    }
    saveConfig({ url: cleanUrl, anonKey: cleanKey })
    resetSupabaseClient()
    onSaved()
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card elevated className="w-full max-w-lg overflow-hidden">
        <div className="tarja-amber" />
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <div className="mb-5 flex items-center gap-3">
            <img src="/icon-192.png" alt="Rodopav" className="h-12 w-12 rounded-lg" />
            <div>
              <p className="label-eyebrow">Magnata Rodopav</p>
              <h1 className="text-lg font-bold leading-tight text-zinc-50">Primeira configuração</h1>
            </div>
          </div>

          <p className="mb-5 text-sm text-zinc-400">
            Cole a URL e a chave pública (anon) do seu projeto Supabase pra o app conseguir conectar.
            Você só precisa fazer isso uma vez por dispositivo.
          </p>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <label htmlFor="supa-url" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Link2 className="mr-1 inline h-3 w-3" /> Supabase URL
              </label>
              <Input
                id="supa-url"
                type="url"
                required
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://rhhmdjipigvtfrzwzchh.supabase.co"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="supa-key" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Key className="mr-1 inline h-3 w-3" /> Anon (public) key
              </label>
              <Input
                id="supa-key"
                type="text"
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGc..."
                className="font-mono text-[11px]"
              />
              <p className="text-[11px] leading-snug text-zinc-500">
                Encontra em Supabase → Settings → API → Project API keys → <code>anon public</code>.
                <br />
                A chave fica salva localmente neste navegador.
              </p>
            </div>

            {erro ? (
              <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{erro}</span>
              </div>
            ) : null}

            <Button type="submit" className="w-full" size="lg">
              <Database className="h-4 w-4" />
              Conectar
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2 rounded-md border border-zinc-800/60 bg-zinc-900/40 p-3 text-[11px] text-zinc-500">
            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
            <p>
              É a mesma chave que você configura no app desktop. RLS do Supabase protege os dados —
              a anon key sozinha não dá acesso a nada sem login.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
