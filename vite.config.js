import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'logo.svg', 'icon-192.png', 'icon-512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/',
        skipWaiting: true,
        clientsClaim: true,
        // ← Ignora TODAS las peticiones externas (Supabase API, auth, storage)
        // Sin esto el SW las intercepta y las bloquea
        navigateFallbackDenylist: [/^\/api/, /^https:\/\//],
        runtimeCaching: [
          {
            // Deja pasar todo lo que vaya a Supabase sin tocar
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'RentaPro',
        short_name: 'RentaPro',
        description: 'Gestión de arriendos y control de inventario',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#22c55e',
        icons: [
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
})
