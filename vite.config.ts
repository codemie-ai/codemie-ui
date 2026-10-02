/// <reference types="vitest" />
import { configDefaults, coverageConfigDefaults } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { prismjsPlugin } from 'vite-plugin-prismjs'
import svgr from 'vite-plugin-svgr'
import federation from '@originjs/vite-plugin-federation'
import { keycloakify } from 'keycloakify/vite-plugin'
import browserslistToEsbuild from 'browserslist-to-esbuild'

import path from 'path'

// CI runs with istanbul coverage (~3× per-test overhead). Heavy tests — a cold dynamic page
// import in unit, React 19 event work in integration — exceed the 5 000 ms default there while
// finishing in ~1 s locally. A timed-out body keeps running and leaks a second render into the
// retry ("Found multiple elements"). If a test fails only in CI with a timeout, raise this value.
const CI_COVERAGE_TEST_TIMEOUT_MS = 30000

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const isKeycloak = process.env.VITE_ENTRY === 'keycloakify'

  return {
    plugins: [
      // When building for Keycloak, rename dist/index-keycloak.html → dist/index.html
      // because keycloakify v11 hardcodes dist/index.html in generateResources.
      isKeycloak && {
        name: 'rename-keycloak-html',
        enforce: 'post' as const,
        generateBundle(_options: unknown, bundle: Record<string, { fileName: string }>) {
          const entry = bundle['index-keycloak.html']
          if (entry) entry.fileName = 'index.html'
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
        '~bootstrap-icons': path.resolve(import.meta.dirname, 'node_modules/bootstrap-icons'),
        '~fonts': path.resolve(import.meta.dirname, 'src/assets/fonts/'),
        '~images': path.resolve(import.meta.dirname, 'src/assets/images/'),
      },
    },
    base: env.VITE_SUFFIX || '/',
    experimental: {
      // Full bundle mode for `vite` dev: serves a Rolldown bundle from memory instead of ~1300
      // unbundled module requests per page load, so a fresh browser context (every test-harness
      // test) loads the app like a production build does. Off under Vitest, which reads this
      // config too and fails to bundle index.html.
      bundledDev: !process.env.VITEST,
    },
    build: {
      // Supported browsers come from "browserslist" in package.json; Vite doesn't read it itself.
      // The Keycloak theme build (VITE_ENTRY=keycloakify) uses the same target.
      target: browserslistToEsbuild(),
      rolldownOptions: {
        input: isKeycloak ? 'index-keycloak.html' : 'index.html',
      },
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_DEV_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
      watch: {
        ignored: ['**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)', '**/coverage/**'],
      },
    },
    test: {
      // Two test projects with separate setup files; each inherits the options below:
      //
      //   unit        — mocks Valtio + stores; fast, isolated, no real reactivity
      //   integration — real Valtio + real stores + mocked API; tests full Component→Store→API chain
      //
      // Run all:         vitest run
      // Run unit only:   vitest run --project unit
      // Run integration: vitest run --project integration
      projects: [
        {
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
            exclude: [...configDefaults.exclude, '**/__tests__/**/*.integration.test.*'],
            setupFiles: ['./src/setupTests', './src/setupTests.unit'],
            testTimeout: CI_COVERAGE_TEST_TIMEOUT_MS,
          },
          server: {
            ws: false,
            hmr: false,
          },
        },
        {
          test: {
            name: 'integration',
            environment: './vitest-env-integration.ts',
            include: ['**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)'],
            setupFiles: ['./src/setupTests', './src/setupTests.integration'],
            // asyncUtilTimeout stays 15 000 ms per wait.
            testTimeout: CI_COVERAGE_TEST_TIMEOUT_MS,
          },
          server: {
            ws: false,
            hmr: false,
          },
        },
      ],
      globals: true,
      retry: 1,
      // Vitest sizes its pool from os.availableParallelism(), which in a CI container reports the
      // whole node's cores, not the pod's 2-CPU request — it spawned dozens of jsdom+coverage
      // workers that starved each other. Cap it here; `--maxWorkers` on the CLI still overrides.
      maxWorkers: 3,
      // Vitest 5 fakes every timer API by default (requestAnimationFrame, requestIdleCallback, performance…);
      // keep the Vitest 1 set so tests that stub those globals themselves behave as before.
      fakeTimers: {
        toFake: [
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'setImmediate',
          'clearImmediate',
          'Date',
        ],
      },
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov', 'html'],
        // Vitest 5 dropped `coverage.all` and reports only files that tests import;
        // `include` restores reporting of untested source files (0 %) as in Vitest 1.
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          ...coverageConfigDefaults.exclude,
          '**/*.d.ts',
          '**/__tests__/**',
          '**/assets/**',
          '**/*config.ts',
          '**/*.cjs',
          '**/main.ts',
          '**/api.ts',
          '**/setupTests.tsx',
          '**/setupTests.unit.ts',
          '**/setupTests.js',
        ],
      },
      sequence: {
        // Vitest 5 defaults to 'stack'; the integration setup (request registry reset, cleanup)
        // was written for the Vitest 1 default, where hooks of one level run in parallel.
        hooks: 'parallel',
        shuffle: {
          files: true,
        },
      },
    },
  }
})
