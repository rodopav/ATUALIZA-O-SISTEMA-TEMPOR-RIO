import * as React from 'react'
import { Bell, BellOff, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from './ui/Button'
import {
  isPushSupported,
  getPushPermission,
  subscribePush,
  PushError,
} from '../lib/push'

const DISMISSED_KEY = 'push_banner_dismissed_at'

type Estado =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; msg: string; code?: PushError['code'] }

/**
 * Banner pedindo permissão de push notification. Mostra apenas se:
 *   - push é suportado
 *   - permission ainda não foi concedida
 *   - usuário não dismissou nas últimas 24h (ou está em 'denied', então mostra
 *     mensagem de instrução)
 *
 * Quando clica "Ativar", mostra feedback claro de erro/sucesso — antes
 * falhava silenciosamente quando faltava VAPID ou outro pré-requisito.
 */
export function PushBanner(): React.ReactElement | null {
  const [show, setShow] = React.useState(false)
  const [estado, setEstado] = React.useState<Estado>({ status: 'idle' })

  React.useEffect(() => {
    void (async () => {
      if (!isPushSupported()) return
      const perm = await getPushPermission()
      if (perm === 'granted') return
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0)
      if (dismissedAt && Date.now() - dismissedAt < 24 * 60 * 60 * 1000 && perm !== 'denied') return
      setShow(true)
    })()
  }, [])

  const ativar = async (): Promise<void> => {
    setEstado({ status: 'loading' })
    try {
      await subscribePush()
      setEstado({ status: 'success' })
      setTimeout(() => setShow(false), 3500)
    } catch (err) {
      if (err instanceof PushError) {
        setEstado({ status: 'error', msg: err.message, code: err.code })
      } else {
        setEstado({
          status: 'error',
          msg: err instanceof Error ? err.message : 'Erro desconhecido',
        })
      }
    }
  }

  const dispensar = (): void => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  if (estado.status === 'success') {
    return (
      <div className="card flex items-center gap-3 border-emerald-500/40 bg-emerald-500/10 p-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        <p className="flex-1 text-sm font-semibold text-emerald-100">
          Notificações ativadas — vou avisar quando chegar nova solicitação.
        </p>
      </div>
    )
  }

  if (estado.status === 'error') {
    return (
      <div className="card border-red-500/40 bg-red-500/[0.06] p-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-200">Não consegui ativar</p>
            <p className="mt-0.5 text-xs leading-snug text-zinc-300">{estado.msg}</p>
            {estado.code === 'denied' ? (
              <p className="mt-2 rounded bg-zinc-900/60 p-2 text-[11px] leading-snug text-zinc-400">
                <strong className="text-zinc-300">iOS:</strong> Ajustes → Notificações → "Aprovações
                Rodopav" → Permitir.
                <br />
                <strong className="text-zinc-300">Android/Chrome:</strong> toque no ícone à esquerda
                da URL → Notificações → Permitir.
              </p>
            ) : null}
          </div>
          <button
            onClick={() => setEstado({ status: 'idle' })}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {estado.code !== 'denied' &&
        estado.code !== 'unsupported' &&
        estado.code !== 'ios-standalone' ? (
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => void ativar()}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="card flex items-center gap-3 border-amb-400/30 bg-amb-400/[0.05] p-3 sm:p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amb-400/20 text-amb-300">
        <Bell className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-100">Ativar notificações</p>
        <p className="text-xs text-zinc-400">Receba alerta quando chegar uma nova solicitação.</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button size="sm" onClick={() => void ativar()} loading={estado.status === 'loading'}>
          Ativar
        </Button>
        <button
          onClick={dispensar}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function PushStatus(): React.ReactElement | null {
  const [perm, setPerm] = React.useState<NotificationPermission | 'unsupported'>('unsupported')
  React.useEffect(() => {
    if (!isPushSupported()) return
    void getPushPermission().then(setPerm)
  }, [])
  if (perm === 'granted') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
        <Bell className="h-2.5 w-2.5" />
        Notificações ativas
      </span>
    )
  }
  if (perm === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
        <BellOff className="h-2.5 w-2.5" />
        Notificações bloqueadas
      </span>
    )
  }
  return null
}
