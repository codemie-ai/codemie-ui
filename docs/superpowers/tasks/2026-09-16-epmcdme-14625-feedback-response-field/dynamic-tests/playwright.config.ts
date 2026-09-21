import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  reporter: [['list'], ['json', { outputFile: 'results.json' }]],
})
