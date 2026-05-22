/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Limpa caches de versões antigas — sem isso, HTML cacheado pode referenciar
// JS bundle que já foi removido da CDN (causa loop / tela em branco no refresh).
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA routing: qualquer navegação (refresh em /pendentes, etc) serve
// /index.html. Sem isso o SW falha em rotas client-side.
const navHandler = createHandlerBoundToURL('/index.html')
const navRoute = new NavigationRoute(navHandler, {
  // Não interceptar arquivos estáticos do próprio SW e API.
  denylist: [/^\/sw\.js$/, /^\/workbox-.*\.js$/, /\.(png|svg|ico|webmanifest|json)$/, /^\/api\//],
})
registerRoute(navRoute)

// Supabase REST: network-first com fallback de cache (offline básico).
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/'),
  new NetworkFirst({
    cacheName: 'supabase-rest',
    networkTimeoutSeconds: 5,
  }),
)

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
