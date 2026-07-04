import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { StaffUser } from '@/entities/staff'
import {
  createMenuItem,
  deleteMenuItem,
  listOptionGroups,
  updateMenuItem,
  type AdminCategoryView,
  type AdminMenuItemView,
} from '@/shared/api/menu-admin'
import { KitchenMenuPage } from './KitchenMenuPage'

vi.mock('@/shared/api/menu-admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/menu-admin')>()
  return {
    ...actual,
    createMenuItem: vi.fn(),
    updateMenuItem: vi.fn(),
    deleteMenuItem: vi.fn(),
    listOptionGroups: vi.fn(),
    createOptionGroup: vi.fn(),
    updateOptionGroup: vi.fn(),
    deleteOptionGroup: vi.fn(),
    createOption: vi.fn(),
    updateOption: vi.fn(),
    deleteOption: vi.fn(),
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
  const props = {
    user,
    initialCategories: categories,
    initialMenuItems: menuItems,
    onManageCategories: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  }
  render(<KitchenMenuPage {...props} />)
  return props
}

describe('KitchenMenuPage', () => {
  beforeEach(() => {
    vi.mocked(createMenuItem).mockReset()
    vi.mocked(updateMenuItem).mockReset()
    vi.mocked(deleteMenuItem).mockReset()
    vi.mocked(listOptionGroups).mockReset()
    vi.mocked(listOptionGroups).mockResolvedValue([])
  })

  it('renders the header and menu admin list from initial props', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Thực đơn' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Phở bò/ })).toBeInTheDocument()
    expect(screen.getByText('Món chính')).toBeInTheDocument()
    expect(screen.getByText('50.000đ')).toBeInTheDocument()
  })

  it('navigates to category management from the menu admin list', () => {
    const props = renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Danh mục' }))

    expect(props.onManageCategories).toHaveBeenCalledTimes(1)
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
