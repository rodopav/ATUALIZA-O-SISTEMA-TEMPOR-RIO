import * as React from 'react'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import type { QueryClient } from '@tanstack/react-query'
import { cn } from '../lib/cn'

interface ErrorEntry {
  id: number
  queryKey: unknown
  message: string
  timestamp: number
}

let nextId = 1
const listeners = new Set<(errors: ErrorEntry[]) => void>()
let errors: ErrorEntry[] = []

function emit(): void {
  for (const fn of listeners) fn([...errors])
}

export function pushQueryError(queryKey: unknown, error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Erro desconhecido'
  // Dedup: se já existe um erro com a mesma queryKey nos últimos 2s, ignora
  const keyStr = JSON.stringify(queryKey)
  const dup = errors.find(
    (e) =>
      JSON.stringify(e.queryKey) === keyStr && Date.now() - e.timestamp < 2000,
  )
  if (dup) return
  errors = [...errors, { id: nextId++, queryKey, message, timestamp: Date.now() }]
  // Auto-remove depois de 8s
  const id = errors[errors.length - 1].id
  setTimeout(() => {
    errors = errors.filter((e) => e.id !== id)
    emit()
  }, 8000)
  emit()
}

function dismiss(id: number): void {
  errors = errors.filter((e) => e.id !== id)
  emit()
}

/**
 * Banner fixo no topo da tela que mostra erros de QUALQUER useQuery
 * falhando. Sem isso, queries que retornam 401/timeout ficavam
 * silenciosas e a UI mostrava skeleton infinito ou dados vazios sem
 * explicação.
 */
export function ErrorToast(): React.ReactElement | null {
  const [list, setList] = React.useState<ErrorEntry[]>(errors)
  React.useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])
  if (list.length === 0) return null

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col gap-2 px-3 sm:px-4',
        'mx-auto max-w-2xl',
      )}
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {list.map((e) => (
        <div
          key={e.id}
          className="pointer-events-auto rounded-lg border border-red-500/50 bg-red-950/90 p-3 text-sm shadow-lg backdrop-blur"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-100">Falha ao carregar dados</p>
              <p className="mt-0.5 break-words text-xs text-red-200/80">{e.message}</p>
            </div>
            <button
              onClick={() => void window.location.reload()}
              className="shrink-0 rounded-md border border-red-400/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-100 hover:bg-red-500/20"
              aria-label="Recarregar"
            >
              <RefreshCw className="inline h-3 w-3" />
            </button>
            <button
              onClick={() => dismiss(e.id)}
              className="shrink-0 rounded-md p-1 text-red-300 hover:bg-red-500/20"
              aria-label="Fechar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Pluga no QueryClient: cada erro de query vira um toast.
 * Chama uma vez na criação do client.
 */
export function attachErrorToastToQueryClient(client: QueryClient): void {
  client.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error') {
      const queryKey = event.query.queryKey
      const error = event.action.error
      pushQueryError(queryKey, error)
    }
  })
}
