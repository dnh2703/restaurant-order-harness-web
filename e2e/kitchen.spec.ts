import { test, expect } from '@playwright/test'

const email = process.env.E2E_KITCHEN_EMAIL
const password = process.env.E2E_KITCHEN_PASSWORD

test.describe('Kitchen screen', () => {
  test('logs in and shows the kitchen board', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_KITCHEN_EMAIL/E2E_KITCHEN_PASSWORD (seeded kitchen@demo.test / kitchen-password)',
    )
    await page.goto('/kitchen/login')
    await page.getByPlaceholder(/Email/).fill(email!)
    await page.getByPlaceholder(/Mật khẩu/).fill(password!)
    await page.getByRole('button', { name: /Đăng nhập/ }).click()
    await expect(page.getByText('Màn hình bếp')).toBeVisible()
    await expect(page.getByText(/Chờ làm/)).toBeVisible()
  })

  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/kitchen')
    await expect(page).toHaveURL(/\/kitchen\/login/)
    await expect(page.getByRole('button', { name: /Đăng nhập/ })).toBeVisible()
  })

  test('redirects an already-logged-in user away from the login page', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_KITCHEN_EMAIL/E2E_KITCHEN_PASSWORD (seeded kitchen@demo.test / kitchen-password)',
    )
    await page.goto('/kitchen/login')
    await page.getByPlaceholder(/Email/).fill(email!)
    await page.getByPlaceholder(/Mật khẩu/).fill(password!)
    await page.getByRole('button', { name: /Đăng nhập/ }).click()
    await expect(page.getByText('Màn hình bếp')).toBeVisible()
    // Revisiting the login route while signed in should bounce back to the board.
    await page.goto('/kitchen/login')
    await expect(page).toHaveURL(/\/kitchen\/?$/)
    await expect(page.getByText('Màn hình bếp')).toBeVisible()
  })
})
