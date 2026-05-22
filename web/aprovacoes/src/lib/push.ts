// Web Push API — inscreve o navegador no Push Service do browser e salva a
// subscription no Supabase (tabela `push_subscriptions`). A Edge Function
// `notify-approvers` envia push quando há nova solicitação.

import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export class PushError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'unsupported'
      | 'no-vapid'
      | 'denied'
      | 'no-sw'
      | 'subscribe-fail'
      | 'persist-fail'
      | 'no-session'
      | 'ios-standalone',
  ) {
    super(message)
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iOS exige PWA instalado (standalone) pra Web Push funcionar (Safari 16.4+). */
function isIosBrowserNotStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  if (!isIos) return false
  const standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return !standalone
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return await Notification.requestPermission()
}

/**
 * Inscreve no Push Service. Lança PushError com .code descritivo se falhar
 * em alguma etapa — o caller mostra a mensagem ao usuário.
 *
 * Idempotente: se já há subscription, só atualiza o registro no banco.
 */
export async function subscribePush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new PushError(
      'Este navegador não suporta notificações push.',
      'unsupported',
    )
  }
  if (isIosBrowserNotStandalone()) {
    throw new PushError(
      'No iOS, notificações só funcionam com o app instalado na tela inicial. Toque em "Compartilhar" → "Adicionar à Tela de Início" e abra pelo ícone.',
      'ios-standalone',
    )
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new PushError(
      'Chave VAPID não configurada (VITE_VAPID_PUBLIC_KEY). Avise o admin.',
      'no-vapid',
    )
  }

  // RLS de push_subscriptions exige sessão válida
  const { data: sessData } = await supabase.auth.getSession()
  if (!sessData.session) {
    throw new PushError('Sessão expirada. Faça login de novo.', 'no-session')
  }

  const perm = await getPushPermission()
  if (perm === 'denied') {
    throw new PushError(
      'Notificações bloqueadas pelo navegador. Abra Configurações do site → permita notificações.',
      'denied',
    )
  }
  if (perm !== 'granted') {
    const req = await requestPushPermission()
    if (req !== 'granted') {
      throw new PushError('Você precisa permitir notificações pra ativar essa função.', 'denied')
    }
  }

  let reg: ServiceWorkerRegistration
  try {
    reg = await navigator.serviceWorker.ready
  } catch {
    throw new PushError('Service Worker não disponível. Recarregue a página.', 'no-sw')
  }

  let sub: PushSubscription | null
  try {
    sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as unknown as BufferSource,
      })
    }
  } catch (err) {
    throw new PushError(
      'Falha ao registrar no serviço de push do navegador: ' +
        (err instanceof Error ? err.message : String(err)),
      'subscribe-fail',
    )
  }

  const payload = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: payload.endpoint,
      p256dh: payload.keys?.p256dh ?? '',
      auth: payload.keys?.auth ?? '',
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  )
  if (error) {
    throw new PushError('Falha ao salvar inscrição no Supabase: ' + error.message, 'persist-fail')
  }
  return sub
}

export async function unsubscribePush(): Promise<void> {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  }
}
