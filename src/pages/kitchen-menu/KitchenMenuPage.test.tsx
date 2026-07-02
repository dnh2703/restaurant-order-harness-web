import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { StaffUser } from '@/entities/staff'
import type { AdminCategoryView, AdminMenuItemView } from '@/shared/api/menu-admin'
import { KitchenMenuPage } from './KitchenMenuPage'

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

describe('KitchenMenuPage', () => {
  it('renders the header and menu admin list from initial props', () => {
    render(
      <KitchenMenuPage
        user={user}
        initialCategories={categories}
        initialMenuItems={menuItems}
        onLogout={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Thực đơn' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Phở bò/ })).toBeInTheDocument()
    expect(screen.getByText('Món chính')).toBeInTheDocument()
    expect(screen.getByText('50.000đ')).toBeInTheDocument()
  })

  it('opens the category dialog from the menu admin list', () => {
    render(
      <KitchenMenuPage
        user={user}
        initialCategories={categories}
        initialMenuItems={menuItems}
        onLogout={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Danh mục' }))

    expect(screen.getByRole('dialog', { name: 'Quản lý danh mục' })).toBeInTheDocument()
  })
})
