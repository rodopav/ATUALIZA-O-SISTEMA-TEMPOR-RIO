import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

/**
 * Banner de erro pra qualquer useQuery. Substitui o "loading infinito"
 * silencioso quando uma RPC/view do Supabase falha — mostra erro
 * visível + botão "Tentar de novo".
 *
 * Se a query estiver OK ou loading, não renderiza nada.
 */
export function QueryErrorBanner({
  q,
  label,
  className,
}: {
  q: Pick<UseQueryResult<unknown, unknown>, 'isError' | 'error' | 'refetch'>
  label: string
  className?: string
}): React.ReactElement | null {
  if (!q.isError) return null
  const msg =
    q.error instanceof Error
      ? q.error.message
      : typeof q.error === 'object' && q.error !== null && 'message' in q.error
        ? String((q.error as { message: unknown }).message)
        : 'Erro desconhecido'

  return (
    <div
      className={cn(
        'card border-red-500/40 bg-red-500/[0.06] p-3 text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-200">Falha ao carregar: {label}</p>
          <p className="mt-0.5 break-words text-xs text-zinc-400">{msg}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void q.refetch()}
          className="shrink-0"
        >
          <RefreshCw className="h-3 w-3" />
          Tentar
        </Button>
      </div>
    </div>
  )
}

/**
 * Wrapper que mostra spinner enquanto carrega, erro se falhar, e
 * `children` quando ok. Timeout de 6s converte loading prolongado em
 * mensagem visível (evita "loading infinito" se Supabase nunca responder).
 */
export function QueryGate({
  q,
  label,
  children,
}: {
  q: Pick<UseQueryResult<unknown, unknown>, 'isLoading' | 'isError' | 'error' | 'refetch'>
  label: string
  children: React.ReactNode
}): React.ReactElement {
  const [stuck, setStuck] = React.useState(false)
  React.useEffect(() => {
    if (!q.isLoading) {
      setStuck(false)
      return
    }
    const t = setTimeout(() => setStuck(true), 6000)
    return () => clearTimeout(t)
  }, [q.isLoading])

  if (q.isError) return <QueryErrorBanner q={q} label={label} />
  if (q.isLoading && stuck) {
    return (
      <div className="card border-amb-400/30 bg-amb-400/[0.05] p-3 text-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amb-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amb-200">Demorando demais: {label}</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              A consulta passou de 6s. Pode ser conexão instável.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void q.refetch()}>
            <RefreshCw className="h-3 w-3" />
            Tentar
          </Button>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
