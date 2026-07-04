import { test, expect } from '@playwright/test'

const email = process.env.E2E_CASHIER_EMAIL
const password = process.env.E2E_CASHIER_PASSWORD

test.describe('Cashier screen', () => {
  test('logs in and shows the tables screen', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_CASHIER_EMAIL/E2E_CASHIER_PASSWORD (seeded CASHIER or ADMIN account, e.g. admin@demo.test / admin-password)',
    )
    await page.goto('/kitchen/login')
    await page.getByPlaceholder('admin@gmail.com').fill(email!)
    await page.getByPlaceholder(/Mật khẩu/).fill(password!)
    await page.getByRole('button', { name: /Đăng nhập/ }).click()

    // Both CASHIER and ADMIN may access the cashier screen; go there directly so the
    // assertion holds regardless of which role's home the login redirected to.
    await page.goto('/kitchen/cashier')
    await expect(page.getByRole('heading', { name: 'Thu ngân' })).toBeVisible()
    // Either at least one open table, or the empty state — both prove the screen loaded.
    await expect(
      page.getByText('Chưa có bàn nào mở').or(page.getByText(/món$/).first()),
    ).toBeVisible()
  })
})
