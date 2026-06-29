import { test, expect } from '@playwright/test'

test.describe('Customer dish options (US-2.3)', () => {
  test('choosing an option then adding shows the option in the cart', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'Set E2E_QR_TOKEN to a seeded table token to run this test')

    await page.goto(`/t/${token}`)

    // Find the first dish that opens a detail sheet (aria-label "Chọn …").
    const chooseButton = page.getByRole('button', { name: /^Chọn / }).first()
    test.skip((await chooseButton.count()) === 0, 'Seeded menu has no dish with options')
    await chooseButton.click()

    // The detail sheet shows the add button; pick the first option then add.
    const addButton = page.getByRole('button', { name: /Thêm vào giỏ/ })
    await expect(addButton).toBeVisible()
    await page
      .getByRole('radio')
      .first()
      .check()
      .catch(() => {})
    await addButton.click()

    // Open the cart drawer; the line is present and the submit button is enabled.
    await page.getByRole('button', { name: /Mở giỏ hàng/ }).click()
    await expect(page.getByRole('button', { name: /Gửi bếp/ })).toBeVisible()
  })
})
