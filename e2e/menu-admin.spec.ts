import { test, expect } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.describe('Menu admin (Epic 6)', () => {
  test('admin manages a category, dish, options, and availability', async ({ page }) => {
    test.skip(
      !email || !password,
      'Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD (seeded admin@demo.test / admin-password)',
    )

    await page.goto('/kitchen/login')
    await page.getByPlaceholder('admin@gmail.com').fill(email!)
    await page.getByPlaceholder(/Mật khẩu/).fill(password!)
    await page.getByRole('button', { name: /Đăng nhập/ }).click()
    await expect(page.getByText('Màn hình bếp')).toBeVisible()

    await page.getByRole('link', { name: /Thực đơn/ }).click()
    await expect(page).toHaveURL(/\/kitchen\/menu/)
    await expect(page.getByRole('heading', { name: 'Thực đơn' })).toBeVisible()

    const stamp = Date.now()
    const categoryName = `Danh mục E2E ${stamp}`
    const dishName = `Món E2E ${stamp}`

    // Create a category.
    await page.getByRole('button', { name: 'Danh mục' }).click()
    const categoryDialog = page.getByRole('dialog', { name: 'Quản lý danh mục' })
    await categoryDialog.getByLabel('Tên danh mục mới').fill(categoryName)
    await categoryDialog.getByLabel('Thứ tự mới').fill('999')
    await categoryDialog.getByRole('button', { name: 'Thêm danh mục' }).click()
    await expect(categoryDialog.getByText(categoryName)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(categoryDialog).toBeHidden()

    // Create a dish in that category.
    await page.getByRole('button', { name: 'Thêm món' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Thêm món' })
    await createDialog.getByLabel('Tên món').fill(dishName)
    await createDialog.getByRole('combobox', { name: 'Danh mục' }).click()
    await page.getByRole('option', { name: categoryName }).click()
    await createDialog.getByLabel('Giá').fill('50000')
    await createDialog.getByRole('button', { name: 'Lưu món' }).click()
    await expect(createDialog).toBeHidden()

    // Filter so the new dish is on the first page regardless of seed size.
    await page.getByLabel('Tìm món').fill(dishName)
    const dishRow = page.locator('tr', { has: page.getByText(dishName, { exact: true }) })
    await expect(dishRow).toBeVisible()

    // Reopen in edit mode to add an option group + option.
    await dishRow.getByRole('button', { name: 'Sửa' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Sửa món' })
    await editDialog.getByLabel('Tên nhóm mới').fill('Size')
    await editDialog.getByRole('button', { name: 'Thêm nhóm' }).click()
    const groupRegion = editDialog.getByRole('region', { name: 'Nhóm Size' })
    await expect(groupRegion).toBeVisible()
    await groupRegion.getByLabel('Tên tùy chọn mới').fill('Lớn')
    await groupRegion.getByLabel('Giá thêm mới').fill('10000')
    await groupRegion.getByRole('button', { name: 'Thêm tùy chọn' }).click()
    await expect(groupRegion.getByRole('group', { name: 'Tùy chọn Lớn' })).toBeVisible()

    // Mark the dish unavailable and save.
    await editDialog.getByLabel('Còn món').uncheck()
    await editDialog.getByRole('button', { name: 'Lưu món' }).click()
    await expect(editDialog).toBeHidden()

    // Customer-facing availability is reflected as "Hết món".
    await expect(dishRow.getByText('Hết món')).toBeVisible()
  })
})
