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

function makeMenuItem(
  id: string,
  name: string,
  overrides: Partial<AdminMenuItemView> = {},
): AdminMenuItemView {
  return {
    id,
    categoryId: 'c1',
    name,
    description: null,
    price: 10000,
    imageUrl: null,
    isAvailable: true,
    sortOrder: Number(id.replace(/\D/g, '')) || 1,
    ...overrides,
  }
}

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

function getDishNames() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
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

  it('renders unsorted input by category sort order, item sort order, Vietnamese name, then missing categories last', () => {
    setup({
      categories: [
        { id: 'drinks', restaurantId: 'r1', name: 'Đồ uống', sortOrder: 2 },
        { id: 'main', restaurantId: 'r1', name: 'Món chính', sortOrder: 1 },
      ],
      menuItems: [
        makeMenuItem('i5', 'Món chưa phân loại', { categoryId: 'missing', sortOrder: 1 }),
        makeMenuItem('i4', 'Trà đào', { categoryId: 'drinks', sortOrder: 1 }),
        makeMenuItem('i3', 'Bánh mì', { categoryId: 'main', sortOrder: 2 }),
        makeMenuItem('i2', 'Bún bò', { categoryId: 'main', sortOrder: 1 }),
        makeMenuItem('i1', 'Bánh cuốn', { categoryId: 'main', sortOrder: 2 }),
      ],
    })

    expect(getDishNames()).toEqual([
      'Bún bò',
      'Bánh cuốn',
      'Bánh mì',
      'Trà đào',
      'Món chưa phân loại',
    ])
  })

  it('keeps page 2 items hidden until navigating to the next page', () => {
    const manyItems = Array.from({ length: 11 }, (_, index) =>
      makeMenuItem(`i${index + 1}`, `Món ${String(index + 1).padStart(2, '0')}`, {
        sortOrder: index + 1,
      }),
    )

    setup({ menuItems: manyItems })

    expect(screen.getByRole('row', { name: /Món 10/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Món 11/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))

    expect(screen.getByRole('row', { name: /Món 11/ })).toBeInTheDocument()
  })

  it('resets to the first page when search changes after visiting a later page', () => {
    const manyItems = Array.from({ length: 11 }, (_, index) =>
      makeMenuItem(`i${index + 1}`, `Món ${String(index + 1).padStart(2, '0')}`, {
        sortOrder: index + 1,
      }),
    )

    setup({ menuItems: manyItems })

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(screen.getByText('Trang 2 / 2')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Tìm món...'), { target: { value: 'Món 0' } })

    expect(screen.getByText('Trang 1 / 1')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Món 01/ })).toBeInTheDocument()
  })

  it('adds visible focus classes to the search and category controls', () => {
    setup()

    expect(
      screen.getByPlaceholderText('Tìm món...').closest('[data-slot="input-wrapper"]'),
    ).toHaveClass('focus-within:ring-2')
    expect(screen.getByRole('combobox', { name: 'Danh mục' })).toHaveClass('focus-visible:ring-2')
  })
})
