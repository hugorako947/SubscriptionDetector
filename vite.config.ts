/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { buildHeadersFile, securityHeaders } from './config/security-headers.ts'

/** Writes dist/_headers from the single CSP source (config/security-headers.ts). */
function securityHeadersFile(): Plugin {
  return {
    name: 'security-headers-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: buildHeadersFile() })
    },
  }
}

const THEME_COLOR = '#1d6a56'
const BACKGROUND_COLOR = '#f5f7f5'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    securityHeadersFile(),
    VitePWA({
      // 'prompt' rather than 'autoUpdate': an automatic reload in the middle of
      // an analysis would lose the screenshots being read (never stored).
      registerType: 'prompt',
      // Icons are already matched by globPatterns below: avoid duplicate precache entries.
      includeManifestIcons: false,
      // Registration is done from React (src/pwa/UpdateBanner.tsx): no inline script.
      injectRegister: false,
      manifest: {
        id: '/',
        name: "Détecteur d'abonnements",
        short_name: 'Abonnements',
        description: "Retrouve tes abonnements à partir de captures d'écran, lues sur ton téléphone.",
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: BACKGROUND_COLOR,
        theme_color: THEME_COLOR,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything needed offline is precached. OCR files (phase 2) will be
        // added here and maximumFileSizeToCacheInBytes raised (Workbox default: 2 MiB).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  preview: {
    // The real CSP is applied locally too, so it is tested before every deploy.
    headers: securityHeaders,
    // Free Cloudflare quick tunnel used to test on a phone over HTTPS (docs/deploiement.md).
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'config/**/*.test.ts'],
  },
})
