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

  // Happy path needs a seeded BE (a valid qr_token with a menu). Runs when
  // E2E_QR_TOKEN is set (e.g. `qr-table-01` from the BE `bun run db:seed`),
  // otherwise skips. The BE must be running on API_BASE_URL (default :3000).
  test('valid token renders the menu with category chips and dishes', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'Set E2E_QR_TOKEN to a seeded table token to run this test')
    await page.goto(`/t/${token}`)
    // Menu rendered: the "Tất cả" category chip and at least one dish card.
    await expect(page.getByRole('button', { name: 'Tất cả' })).toBeVisible()
    await expect(page.locator('[data-dish]').first()).toBeVisible()
  })

  test('search filters the menu (US-2.2)', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'needs a seeded qr_token (backlog #2)')
    await page.goto(`/t/${token}`)
    await expect(page.getByPlaceholder('Tìm món…')).toBeVisible()
    const before = await page.locator('[data-dish]').count()
    await page.getByPlaceholder('Tìm món…').fill('zzz-no-match')
    await expect(page.getByText('Không tìm thấy món phù hợp.')).toBeVisible()
    await page.getByPlaceholder('Tìm món…').fill('')
    await expect(page.locator('[data-dish]')).toHaveCount(before)
  })
})
