import { test, expect } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.describe('admin reports', () => {
  test('logs in and views the reports screen', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD (seeded ADMIN account, e.g. admin@demo.test / admin-password)',
    )
    await page.goto('/kitchen/login')
    await page.getByPlaceholder('admin@gmail.com').fill(email!)
    await page.getByPlaceholder(/Mật khẩu/).fill(password!)
    await page.getByRole('button', { name: /Đăng nhập/ }).click()

    await page.goto('/kitchen/reports')
    await expect(page.getByRole('heading', { name: 'Báo cáo' })).toBeVisible()
    await expect(page.getByText('Tổng doanh thu')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Món bán chạy' })).toBeVisible()
  })
})
