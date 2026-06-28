import { defineConfig, devices } from '@playwright/test'

const PORT = 3001
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Boot the FE dev server for the tests. NOTE: data fetching happens in
  // server functions, so the FE server calls the Elysia BE (API_BASE_URL,
  // default http://localhost:3000). The BE must be running for routes that
  // resolve a table. Point API_BASE_URL at a stub to test without a real BE.
  webServer: {
    command: 'bun run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
