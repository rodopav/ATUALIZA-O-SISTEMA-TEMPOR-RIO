// Web Push API — inscreve o navegador no Push Service do browser e
// salva a subscription no Supabase (tabela `push_subscriptions`).
// A Edge Function `notificar_aprovadores` envia a push quando há nova solicitação.

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

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
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
 * Inscreve no Push Service. Idempotente — se já tem subscription, retorna ela.
 * Persiste o endpoint+keys em `push_subscriptions` no Supabase.
 */
export async function subscribePush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY não configurada — push desabilitado')
    return null
  }

  const perm = await getPushPermission()
  if (perm !== 'granted') {
    const req = await requestPushPermission()
    if (req !== 'granted') return null
  }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    // applicationServerKey aceita BufferSource — TS5 strict reclama de
    // Uint8Array<ArrayBufferLike>, então cast explícito.
    const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key as unknown as BufferSource,
    })
  }

  // Persiste no banco. SECURITY DEFINER RPC seria ideal, mas RLS simples
  // com auth.uid() resolve. Tabela criada via migration (ver README).
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
    console.warn('[push] Falha ao salvar subscription:', error.message)
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
