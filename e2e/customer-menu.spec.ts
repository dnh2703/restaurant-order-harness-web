import { test, expect } from '@playwright/test'

test.describe('Customer menu (US-2.1)', () => {
  test('home page shows the entry instructions', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Restaurant QR Ordering' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mở bàn demo' })).toBeVisible()
  })

  test('invalid table token shows the error screen', async ({ page }) => {
    // "demo" is not a real qr_token -> BE returns 404 -> error UI.
    // Requires the Elysia backend running on API_BASE_URL (default :3000).
    await page.goto('/t/demo')
    await expect(page.getByRole('heading', { name: 'Bàn không hợp lệ' })).toBeVisible()
  })

  // Happy path needs a seeded BE (a valid qr_token with a menu) OR a stub
  // backend via API_BASE_URL. Enable once seed/stub exists.
  test.skip('valid token renders the menu grouped by category', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'Set E2E_QR_TOKEN to a seeded table token to run this test')
    await page.goto(`/t/${token}`)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
