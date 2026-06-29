// e2e/order-tracking.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Customer order tracking (US-9.2)', () => {
  test('submitting an order navigates to the live tracker', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'Set E2E_QR_TOKEN to a seeded table token to run this test')

    await page.goto(`/t/${token}`)
    // Add the first dish to the cart.
    // The button has aria-label="Thêm <dish name>" (confirmed in MenuGrid.tsx line 54).
    await page.locator('[data-dish]').first().getByRole('button', { name: /Thêm/ }).click()
    // Open the cart drawer and submit.
    await page.getByRole('button', { name: /Mở giỏ hàng/ }).click()
    await page.getByRole('button', { name: /Gửi bếp/ }).click()

    // Auto-navigated to the tracking page.
    await expect(page).toHaveURL(new RegExp(`/t/${token}/order`))
    await expect(page.getByText('Đơn của bạn')).toBeVisible()
    // The submitted item shows the initial PENDING label.
    await expect(page.getByText('Chờ xác nhận').first()).toBeVisible()
    // A connection indicator is present (live or syncing).
    await expect(page.getByText(/Đang (cập nhật trực tiếp|đồng bộ)/)).toBeVisible()
  })

  test('visiting the order route directly renders the tracker shell', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'Set E2E_QR_TOKEN to a seeded table token to run this test')
    await page.goto(`/t/${token}/order`)
    await expect(page.getByText('Đơn của bạn')).toBeVisible()
  })
})
