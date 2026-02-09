import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AGPIA – Les prières des heures',
        short_name: 'AGPIA',
        description: 'Les prières des heures – lecture hors ligne',
        theme_color: '#2c2416',
        background_color: '#f8f3eb',
        display: 'standalone',
        start_url: '/',
        lang: 'fr',
        icons: [
          {
            src: '/agpia/assets/cover.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/agpia/assets/cover.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/agpia\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'agpia-content',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
})
