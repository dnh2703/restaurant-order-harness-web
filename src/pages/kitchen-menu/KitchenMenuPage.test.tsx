import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { StaffUser } from '@/entities/staff'
import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  updateCategory,
  updateMenuItem,
  type AdminCategoryView,
  type AdminMenuItemView,
} from '@/shared/api/menu-admin'
import { KitchenMenuPage } from './KitchenMenuPage'

vi.mock('@/shared/api/menu-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/menu-admin')>()
  return {
    ...actual,
    createCategory: vi.fn(),
    createMenuItem: vi.fn(),
    updateCategory: vi.fn(),
    updateMenuItem: vi.fn(),
    deleteCategory: vi.fn(),
    deleteMenuItem: vi.fn(),
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

const menuItems: AdminMenuItemView[] = [
  {
    id: 'i1',
    categoryId: 'c1',
    name: 'Phở bò',
    description: null,
    price: 50000,
    imageUrl: null,
    isAvailable: true,
    sortOrder: 1,
  },
]

function renderPage(overrides: Partial<React.ComponentProps<typeof KitchenMenuPage>> = {}) {
  render(
    <KitchenMenuPage
      user={user}
      initialCategories={categories}
      initialMenuItems={menuItems}
      onLogout={vi.fn()}
      {...overrides}
    />,
  )
}

function openCategoryDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Danh mục' }))
  return screen.getByRole('dialog', { name: 'Quản lý danh mục' })
}

function categoryNamesInDialog() {
  return within(screen.getByRole('dialog', { name: 'Quản lý danh mục' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
}

describe('KitchenMenuPage', () => {
  beforeEach(() => {
    vi.mocked(createCategory).mockReset()
    vi.mocked(createMenuItem).mockReset()
    vi.mocked(updateCategory).mockReset()
    vi.mocked(updateMenuItem).mockReset()
    vi.mocked(deleteCategory).mockReset()
    vi.mocked(deleteMenuItem).mockReset()
  })

  it('renders the header and menu admin list from initial props', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Thực đơn' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Phở bò/ })).toBeInTheDocument()
    expect(screen.getByText('Món chính')).toBeInTheDocument()
    expect(screen.getByText('50.000đ')).toBeInTheDocument()
  })

  it('opens the category dialog from the menu admin list', () => {
    renderPage()

    openCategoryDialog()

    expect(screen.getByRole('dialog', { name: 'Quản lý danh mục' })).toBeInTheDocument()
  })

  it('creates a category and sorts the local category list', async () => {
    vi.mocked(createCategory).mockResolvedValue({
      id: 'c2',
      restaurantId: 'r1',
      name: 'Đồ uống',
      sortOrder: 0,
    })
    renderPage()

    openCategoryDialog()
    fireEvent.change(screen.getByLabelText('Tên danh mục mới'), { target: { value: ' Đồ uống ' } })
    fireEvent.change(screen.getByLabelText('Thứ tự mới'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith({
        data: { name: 'Đồ uống', sortOrder: 0 },
      })
    })
    await waitFor(() => {
      expect(categoryNamesInDialog()).toEqual(['Đồ uống', 'Món chính'])
    })
  })

  it('updates a category locally after a successful mutation', async () => {
    vi.mocked(updateCategory).mockResolvedValue({
      id: 'c1',
      restaurantId: 'r1',
      name: 'Món nóng',
      sortOrder: 3,
    })
    renderPage()

    openCategoryDialog()
    fireEvent.click(
      within(screen.getByRole('row', { name: /Món chính/ })).getByRole('button', { name: 'Sửa' }),
    )
    fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: ' Món nóng ' } })
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu danh mục' }))

    await waitFor(() => {
      expect(updateCategory).toHaveBeenCalledWith({
        data: { id: 'c1', name: 'Món nóng', sortOrder: 3 },
      })
    })
    expect(screen.getByRole('row', { name: /Món nóng/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Món chính/ })).not.toBeInTheDocument()
  })

  it('deletes a category locally after a successful mutation', async () => {
    vi.mocked(deleteCategory).mockResolvedValue()
    renderPage({
      initialCategories: [
        { id: 'c2', restaurantId: 'r1', name: 'Đồ uống', sortOrder: 2 },
        { id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 1 },
      ],
    })

    openCategoryDialog()
    fireEvent.click(
      within(screen.getByRole('row', { name: /Đồ uống/ })).getByRole('button', { name: 'Xóa' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xóa danh mục' }))

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith({ data: { id: 'c2' } })
    })
    expect(screen.queryByRole('row', { name: /Đồ uống/ })).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Món chính/ })).toBeInTheDocument()
  })

  it('keeps the category dialog draft visible when create is rejected', async () => {
    vi.mocked(createCategory).mockRejectedValue(new Error('Không thêm được danh mục'))
    renderPage()

    openCategoryDialog()
    fireEvent.change(screen.getByLabelText('Tên danh mục mới'), {
      target: { value: 'Tráng miệng' },
    })
    fireEvent.change(screen.getByLabelText('Thứ tự mới'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }))

    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith({
        data: { name: 'Tráng miệng', sortOrder: 5 },
      })
    })
    expect(screen.getByRole('dialog', { name: 'Quản lý danh mục' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tên danh mục mới')).toHaveValue('Tráng miệng')
    expect(screen.getByLabelText('Thứ tự mới')).toHaveValue(5)
  })

  it('creates a menu item and sorts it into the local list', async () => {
    vi.mocked(createMenuItem).mockResolvedValue({
      id: 'i2',
      categoryId: 'c1',
      name: 'Bánh mì',
      description: null,
      price: 25000,
      imageUrl: null,
      isAvailable: true,
      sortOrder: 0,
    })
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Thêm món' }))
    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: '  Bánh mì  ' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '25000' } })
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('Ảnh'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('Thứ tự'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món' }))

    await waitFor(() => {
      expect(createMenuItem).toHaveBeenCalledWith({
        data: {
          categoryId: 'c1',
          name: 'Bánh mì',
          price: 25000,
          description: null,
          imageUrl: null,
          isAvailable: true,
          sortOrder: 0,
        },
      })
    })

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'Bánh mì',
      'Phở bò',
    ])
  })

  it('updates a menu item locally after a successful mutation', async () => {
    vi.mocked(updateMenuItem).mockResolvedValue({
      ...menuItems[0]!,
      name: 'Phở đặc biệt',
      price: 65000,
      sortOrder: 2,
    })
    renderPage()

    fireEvent.click(
      within(screen.getByRole('row', { name: /Phở bò/ })).getByRole('button', { name: 'Sửa' }),
    )
    fireEvent.change(screen.getByLabelText('Tên món'), { target: { value: '  Phở đặc biệt  ' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '65000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu món' }))

    await waitFor(() => {
      expect(updateMenuItem).toHaveBeenCalledWith({
        data: {
          id: 'i1',
          categoryId: 'c1',
          name: 'Phở đặc biệt',
          price: 65000,
          description: null,
          imageUrl: null,
          isAvailable: true,
          sortOrder: 1,
        },
      })
    })
    expect(screen.getByRole('row', { name: /Phở đặc biệt/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Phở bò/ })).not.toBeInTheDocument()
  })

  it('deletes a menu item locally after confirmation', async () => {
    vi.mocked(deleteMenuItem).mockResolvedValue()
    renderPage()

    fireEvent.click(
      within(screen.getByRole('row', { name: /Phở bò/ })).getByRole('button', { name: 'Xóa' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xóa món' }))

    await waitFor(() => {
      expect(deleteMenuItem).toHaveBeenCalledWith({ data: { id: 'i1' } })
    })
    expect(screen.queryByRole('row', { name: /Phở bò/ })).not.toBeInTheDocument()
    expect(screen.getByText('Chưa có món nào. Thêm món đầu tiên ở trên.')).toBeInTheDocument()
  })
})
