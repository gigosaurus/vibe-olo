import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { appConfig } from './src/config/app-config.ts';

// The manifest is derived from the same config object the UI reads, so renaming
// the product in `src/config/app-config.ts` updates the installed app too.
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      // Everything in `public/` (icons, offline.html) is already picked up by
      // the workbox glob below, so neither `includeAssets` nor the plugin's
      // automatic manifest-icon injection is needed: both would only add
      // duplicate precache entries.
      includeManifestIcons: false,
      manifest: {
        name: appConfig.name,
        short_name: appConfig.shortName,
        description: appConfig.description,
        id: '/',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: appConfig.themeColor,
        background_color: appConfig.backgroundColor,
        lang: 'en',
        categories: ['games', 'entertainment', 'social'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/offline\.html$/],
        cleanupOutdatedCaches: true,
        // Take control on the very first load so the app is usable offline
        // without a second visit. `skipWaiting` stays off (registerType is
        // 'prompt'), so an update still waits for the user to accept it and
        // never takes over mid-game.
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
