/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()
clientsClaim()

// ===================== PUSH NOTIFICATIONS =====================

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data: PushPayload = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Aprovações', body: event.data.text() }
  }

  const title = data.title ?? 'Nova solicitação'
  const options: NotificationOptions = {
    body: data.body ?? 'Uma nova solicitação aguarda sua aprovação.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag ?? 'aprovacoes-novo',
    requireInteraction: false,
    data: { url: data.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await (client as WindowClient).navigate(targetUrl)
            } catch {
              /* ignore — algumas plataformas bloqueiam navigate */
            }
          }
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
