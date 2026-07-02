import { test, expect } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/kitchen/login')
  await page.getByPlaceholder('admin@gmail.com').fill(email!)
  await page.getByPlaceholder(/Mật khẩu/).fill(password!)
  await page.getByRole('button', { name: /Đăng nhập/ }).click()
}

test.describe('Kitchen tables (admin QR)', () => {
  test('admin opens Bàn ăn and creates a table whose QR resolves', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD (seeded admin@demo.test / admin-password)',
    )

    await loginAdmin(page)
    await expect(page.getByText('Màn hình bếp')).toBeVisible()

    await page.getByRole('link', { name: /Bàn ăn/ }).click()
    await expect(page).toHaveURL(/\/kitchen\/tables/)
    await expect(page.getByRole('heading', { name: 'Bàn ăn' })).toBeVisible()

    const tableName = `Bàn E2E ${Date.now()}`
    await page.getByLabel('Tên bàn').fill(tableName)
    await page.getByRole('button', { name: /Thêm bàn/ }).click()
    await expect(page.getByText(tableName)).toBeVisible()

    const row = page.locator('tr', { has: page.getByText(tableName, { exact: true }) })
    await row.getByRole('button', { name: 'Mã QR' }).click()
    await expect(page.getByText(/Khách quét mã này/)).toBeVisible()

    const linkText = await page.locator('p.break-all').last().textContent()
    expect(linkText).toMatch(/\/t\//)

    const token = linkText!.split('/t/')[1]!
    await page.goto(`/t/${token}`)
    await expect(page.getByText(/Bếp Minh Châu|Thực đơn/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('kitchen staff cannot open /kitchen/tables', async ({ page }) => {
    const kitchenEmail = process.env.E2E_KITCHEN_EMAIL
    const kitchenPassword = process.env.E2E_KITCHEN_PASSWORD
    test.skip(
      !kitchenEmail || !kitchenPassword,
      'Set E2E_KITCHEN_EMAIL/E2E_KITCHEN_PASSWORD for this test',
    )

    await page.goto('/kitchen/login')
    await page.getByPlaceholder('admin@gmail.com').fill(kitchenEmail!)
    await page.getByPlaceholder(/Mật khẩu/).fill(kitchenPassword!)
    await page.getByRole('button', { name: /Đăng nhập/ }).click()
    await expect(page.getByText('Màn hình bếp')).toBeVisible()
    expect(await page.getByRole('link', { name: /Bàn ăn/ }).count()).toBe(0)

    await page.goto('/kitchen/tables')
    await expect(page).toHaveURL(/\/kitchen\/?$/)
    await expect(page.getByText('Màn hình bếp')).toBeVisible()
  })
})
