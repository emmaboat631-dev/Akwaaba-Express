import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
import relayPlugin from './relay-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Self-signed HTTPS so the phone gets a secure context — required for the
    // driver QR camera scanner (browsers block getUserMedia on http for
    // non-localhost origins). The embedded preview browser won't accept the
    // cert, so preview from real Chrome/Edge locally + your phone.
    basicSsl(),
    // Dev-only LAN sync server (see relay-plugin.js) at wss://<host>/relay.
    relayPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Akwaaba Express',
        short_name: 'Akwaaba',
        description: 'Hail a live bus or book your next intercity trip across Ghana.',
        theme_color: '#06392F',
        background_color: '#F4F5F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { host: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
    // e2e/ holds Playwright specs — they must not run under Vitest.
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
})
