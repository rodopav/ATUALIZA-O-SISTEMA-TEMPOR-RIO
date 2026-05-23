import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Magnata PWA — dashboard executivo do grupo Rodopav.
// Builds estático que a Vercel serve direto do CDN.
// PWA instalável (Add to Home Screen) com cache offline básico.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Magnata Dashboard — Rodopav',
        short_name: 'Magnata',
        description: 'Cockpit executivo do CFO — tesouraria Rodopav',
        theme_color: '#0b0b0b',
        background_color: '#0b0b0b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // skipWaiting + clientsClaim: novo SW assume IMEDIATAMENTE quando user
        // abre — sem precisar fechar todas as abas. cleanupOutdatedCaches
        // remove caches de versões antigas (sem isso, refresh em rota client-side
        // serve HTML antigo apontando pra JS bundle que já foi limpo da CDN
        // = tela em branco / loop).
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // SPA routing: refresh em /liquidez serve /index.html (já com rewrite
        // na Vercel, mas o SW intercepta antes — sem navigateFallback ele
        // procura /liquidez.html no cache, não acha, dá erro).
        navigateFallback: 'index.html',
        // /sw.js, /workbox-*.js, manifest e arquivos .png NÃO devem cair no
        // fallback (precisam ser servidos como estão).
        navigateFallbackDenylist: [/^\/sw\.js$/, /^\/workbox-.*\.js$/, /\.(png|svg|ico|webmanifest)$/, /^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Supabase REST: NetworkOnly. Dado financeiro sensível NÃO deve
            // ficar cacheado no dispositivo. Quem tiver acesso ao device
            // (físico ou via XSS) leria valores de saldo/tesouraria offline
            // em Cache Storage. Trade-off: o app não funciona offline pra
            // dados Supabase, mas isso é certo pra cockpit financeiro.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Auth/Realtime/Storage do Supabase também NetworkOnly.
            urlPattern: /^https:\/\/.*\.supabase\.co\/(auth|realtime|storage)\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // HTML do shell — sempre tenta rede antes (evita servir HTML antigo
            // apontando pra JS bundle expirado).
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-shell',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5174, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})
