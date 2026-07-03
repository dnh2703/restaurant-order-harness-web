import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { StaffUser } from '@/entities/staff'
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type AdminCategoryView,
} from '@/shared/api/menu-admin'
import { KitchenCategoriesPage } from './KitchenCategoriesPage'

vi.mock('@/shared/api/menu-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/menu-admin')>()
  return {
    ...actual,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  }
})

const user: StaffUser = {
  id: 'u1',
  email: 'admin@demo.test',
  name: 'Quản lý',
  role: 'ADMIN',
  restaurantId: 'r1',
}

const categories: AdminCategoryView[] = [
  { id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 1 },
]

function renderPage(overrides: Partial<React.ComponentProps<typeof KitchenCategoriesPage>> = {}) {
  const props = {
    user,
    initialCategories: categories,
    onLogout: vi.fn(),
    onBack: vi.fn(),
    onChanged: vi.fn(),
    ...overrides,
  }
  render(<KitchenCategoriesPage {...props} />)
  return props
}

describe('KitchenCategoriesPage', () => {
  beforeEach(() => {
    vi.mocked(createCategory).mockReset()
    vi.mocked(updateCategory).mockReset()
    vi.mocked(deleteCategory).mockReset()
  })

  it('renders the category table and navigates back', () => {
    const props = renderPage()

    expect(screen.getByRole('heading', { name: 'Danh mục' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Món chính/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Thực đơn/ }))
    expect(props.onBack).toHaveBeenCalledTimes(1)
  })

  it('creates a category through the modal and sorts it into the list', async () => {
    vi.mocked(createCategory).mockResolvedValue({
      id: 'c2',
      restaurantId: 'r1',
      name: 'Đồ uống',
      sortOrder: 0,
    })
    const props = renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))
    const dialog = screen.getByRole('dialog', { name: 'Thêm danh mục' })
    fireEvent.change(within(dialog).getByLabelText('Tên danh mục'), {
      target: { value: ' Đồ uống ' },
    })
    fireEvent.change(within(dialog).getByLabelText('Thứ tự'), { target: { value: '0' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith({ data: { name: 'Đồ uống', sortOrder: 0 } })
    })
    await waitFor(() => {
      expect(props.onChanged).toHaveBeenCalled()
    })

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'Đồ uống',
      'Món chính',
    ])
  })

  it('edits a category through the modal', async () => {
    vi.mocked(updateCategory).mockResolvedValue({
      id: 'c1',
      restaurantId: 'r1',
      name: 'Món nóng',
      sortOrder: 3,
    })
    renderPage()

    fireEvent.click(
      within(screen.getByRole('row', { name: /Món chính/ })).getByRole('button', { name: 'Sửa' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Sửa danh mục' })
    fireEvent.change(within(dialog).getByLabelText('Tên danh mục'), {
      target: { value: ' Món nóng ' },
    })
    fireEvent.change(within(dialog).getByLabelText('Thứ tự'), { target: { value: '3' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu danh mục' }))

    await waitFor(() => {
      expect(updateCategory).toHaveBeenCalledWith({
        data: { id: 'c1', name: 'Món nóng', sortOrder: 3 },
      })
    })
    expect(screen.getByRole('row', { name: /Món nóng/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Món chính/ })).not.toBeInTheDocument()
  })

  it('deletes a category after confirmation', async () => {
    vi.mocked(deleteCategory).mockResolvedValue()
    renderPage()

    fireEvent.click(
      within(screen.getByRole('row', { name: /Món chính/ })).getByRole('button', { name: 'Xóa' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xóa danh mục' }))

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith({ data: { id: 'c1' } })
    })
    expect(screen.queryByRole('row', { name: /Món chính/ })).not.toBeInTheDocument()
    expect(
      screen.getByText('Chưa có danh mục nào. Thêm danh mục đầu tiên ở trên.'),
    ).toBeInTheDocument()
  })
})
