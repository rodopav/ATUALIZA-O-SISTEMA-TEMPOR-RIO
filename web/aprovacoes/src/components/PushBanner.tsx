import * as React from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { Button } from './ui/Button'
import {
  isPushSupported,
  getPushPermission,
  subscribePush,
} from '../lib/push'

const DISMISSED_KEY = 'push_banner_dismissed_at'

/**
 * Banner pedindo permissão de push notification. Mostra apenas se:
 *   - push é suportado
 *   - permission ainda não concedida
 *   - usuário não dismissou nas últimas 24h
 */
export function PushBanner(): React.ReactElement | null {
  const [show, setShow] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    void (async () => {
      if (!isPushSupported()) return
      const perm = await getPushPermission()
      if (perm === 'granted') return
      if (perm === 'denied') return
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0)
      if (dismissedAt && Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return
      setShow(true)
    })()
  }, [])

  const ativar = async (): Promise<void> => {
    setLoading(true)
    try {
      const sub = await subscribePush()
      if (sub) setShow(false)
    } finally {
      setLoading(false)
    }
  }

  const dispensar = (): void => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

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
        <Button size="sm" onClick={ativar} loading={loading}>
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
