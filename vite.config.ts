/// <reference types="vitest" />
import { coverageConfigDefaults } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { prismjsPlugin } from 'vite-plugin-prismjs'
import svgr from 'vite-plugin-svgr'
import federation from '@originjs/vite-plugin-federation'
import { keycloakify } from 'keycloakify/vite-plugin'

import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      {
        name: 'keycloak-entry',
        enforce: 'pre',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            if (process.env.VITE_ENTRY === 'keycloakify') {
              console.log('[keycloak-entry] Switching entry to keycloakify.tsx')
              return html.replace(
                '/src/main.tsx',
                '/src/authentication/keycloak-theme/keycloakify.tsx'
              )
            }
            return html
          },
        },
      },
      react({ include: /\.(jsx|tsx)$/ }),
      svgr(),
      prismjsPlugin({
        languages: 'all',
      }),
      federation({
        name: 'codemie-ui-host',
        remotes: {
          // Known remote modules. Should equal to an application slug from /applications request
          'angular-upgrade-app': '',
        },
      }),
      keycloakify({
        themeName: 'codemie',
        themeVersion: '1.0.0',
        accountThemeImplementation: 'none',
        keycloakVersionTargets: {
          '22-to-25': false,
          'all-other-versions': 'keycloak-theme-codemie.jar',
        },
        environmentVariables: [
          { name: 'KC_ENTRA_TENANT_ID', default: '' },
          { name: 'KC_ENTRA_CLIENT_ID', default: '' },
          { name: 'KC_ENTRA_CLIENT_SECRET', default: '' },
        ],
        startKeycloakOptions: {
          port: 8888,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~bootstrap-icons': path.resolve(__dirname, 'node_modules/bootstrap-icons'),
        '~fonts': path.resolve(__dirname, 'src/assets/fonts/'),
        '~images': path.resolve(__dirname, 'src/assets/images/'),
      },
    },
    base: env.VITE_SUFFIX || '/',
    server: {
      host: true,
      watch: {
        ignored: ['**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)', '**/coverage/**'],
      },
    },
    test: {
      setupFiles: ['./src/setupTests'],
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov'],
        exclude: [
          ...coverageConfigDefaults.exclude,
          '**/__tests__/**',
          '**/assets/**',
          '**/*config.ts',
          '**/*.cjs',
          '**/main.ts',
          '**/api.ts',
          '**/setupTests.ts',
          '**/setupTests.js',
        ],
      },
      include: ['**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      sequence: {
        shuffle: {
          files: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler', // or "modern"}
        },
      },
    },
  }
})
