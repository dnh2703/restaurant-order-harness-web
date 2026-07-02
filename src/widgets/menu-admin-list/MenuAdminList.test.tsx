import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { AdminCategoryView, AdminMenuItemView } from '@/shared/api/menu-admin'
import { MenuAdminList } from './MenuAdminList'

const categories: AdminCategoryView[] = [
  { id: 'c2', restaurantId: 'r1', name: 'Đồ uống', sortOrder: 2 },
  { id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 1 },
]

const menuItems: AdminMenuItemView[] = [
  {
    id: 'i1',
    categoryId: 'c1',
    name: 'Phở bò',
    description: 'Tái nạm',
    price: 50000,
    imageUrl: null,
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: 'i2',
    categoryId: 'c2',
    name: 'Trà đào',
    description: null,
    price: 35000,
    imageUrl: null,
    isAvailable: false,
    sortOrder: 2,
  },
]

function setup(overrides: Partial<React.ComponentProps<typeof MenuAdminList>> = {}) {
  const props = {
    categories,
    menuItems,
    onCreateItem: vi.fn(),
    onEditItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onOpenCategories: vi.fn(),
    ...overrides,
  }

  render(<MenuAdminList {...props} />)

  return props
}

describe('MenuAdminList', () => {
  it('renders dish rows with name, category, price, status, and option placeholder', () => {
    setup()

    const row = screen.getByRole('row', { name: /Phở bò/ })

    expect(within(row).getByText('Phở bò')).toBeInTheDocument()
    expect(within(row).getByText('Món chính')).toBeInTheDocument()
    expect(within(row).getByText('50.000đ')).toBeInTheDocument()
    expect(within(row).getByText('Còn món')).toBeInTheDocument()
    expect(within(row).getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Hết món')).toBeInTheDocument()
  })

  it('filters by search text', () => {
    setup()

    fireEvent.change(screen.getByPlaceholderText('Tìm món...'), { target: { value: 'pho' } })

    expect(screen.getByRole('row', { name: /Phở bò/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Trà đào/ })).not.toBeInTheDocument()
  })

  it('filters by category', () => {
    setup()

    fireEvent.click(screen.getByRole('combobox', { name: 'Danh mục' }))
    fireEvent.click(screen.getByRole('option', { name: 'Đồ uống' }))

    expect(screen.getByRole('row', { name: /Trà đào/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Phở bò/ })).not.toBeInTheDocument()
  })

  it('calls create, category, edit, and delete callbacks', () => {
    const props = setup()

    fireEvent.click(screen.getByRole('button', { name: 'Thêm món' }))
    fireEvent.click(screen.getByRole('button', { name: 'Danh mục' }))
    fireEvent.click(
      within(screen.getByRole('row', { name: /Phở bò/ })).getByRole('button', { name: 'Sửa' }),
    )
    fireEvent.click(
      within(screen.getByRole('row', { name: /Phở bò/ })).getByRole('button', { name: 'Xóa' }),
    )

    expect(props.onCreateItem).toHaveBeenCalledTimes(1)
    expect(props.onOpenCategories).toHaveBeenCalledTimes(1)
    expect(props.onEditItem).toHaveBeenCalledWith(menuItems[0])
    expect(props.onDeleteItem).toHaveBeenCalledWith(menuItems[0])
  })
})
