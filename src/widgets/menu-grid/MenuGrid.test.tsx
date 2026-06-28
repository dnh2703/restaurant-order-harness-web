import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MenuGrid } from './MenuGrid'
import type { Menu } from '@/entities/menu/model'

const menu: Menu = {
  categories: [
    {
      id: 'c1',
      name: 'Món chính',
      items: [
        {
          id: 'i1',
          name: 'Phở bò',
          description: 'Truyền thống',
          price: 50000,
          imageUrl: null,
          isAvailable: true,
          optionGroups: [],
        },
        {
          id: 'i2',
          name: 'Bún chả',
          description: null,
          price: 45000,
          imageUrl: null,
          isAvailable: false,
          optionGroups: [],
        },
      ],
    },
  ],
}
const cats = [{ id: 'c1', name: 'Món chính' }]

function setup(over = {}) {
  const props = {
    menu,
    categories: cats,
    activeCat: 'all',
    onSelectCat: vi.fn(),
    quantities: {},
    onAdd: vi.fn(),
    ...over,
  }
  render(<MenuGrid {...props} />)
  return props
}

describe('MenuGrid', () => {
  it('renders dishes with formatted price and a chip per category plus Tất cả', () => {
    setup()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText(/50[.,]000đ/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Món chính' })).toBeInTheDocument()
  })
  it('marks sold-out dishes and disables their add button', () => {
    setup()
    expect(screen.getByText('Hết hàng')).toBeInTheDocument()
    const addButtons = screen.getAllByRole('button', { name: /Thêm/ })
    // Bún chả's add button is disabled.
    expect(addButtons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })
  it('calls onAdd for an available dish', () => {
    const { onAdd } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }))
  })
  it('selecting a chip calls onSelectCat', () => {
    const { onSelectCat } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Món chính' }))
    expect(onSelectCat).toHaveBeenCalledWith('c1')
  })
  it('shows empty state when no items', () => {
    setup({ menu: { categories: [] } })
    expect(screen.getByText(/Không tìm thấy/)).toBeInTheDocument()
  })
})
