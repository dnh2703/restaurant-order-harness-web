import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MenuList } from './MenuList'
import type { Menu } from '@/entities/menu/model'

function makeMenu(): Menu {
  return {
    categories: [
      {
        id: 'c1',
        name: 'Món chính',
        items: [
          {
            id: 'i1',
            name: 'Phở bò',
            description: 'Phở truyền thống',
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
}

describe('MenuList', () => {
  it('renders categories and dishes with formatted prices', () => {
    render(<MenuList menu={makeMenu()} />)
    expect(screen.getByText('Món chính')).toBeInTheDocument()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText(/50[.,]000/)).toBeInTheDocument()
  })

  it('marks unavailable dishes as sold out', () => {
    render(<MenuList menu={makeMenu()} />)
    // Sold-out label only appears on the unavailable item.
    const soldOut = screen.getByText('Hết hàng')
    expect(soldOut).toBeInTheDocument()
    // The unavailable item card is dimmed (opacity-50).
    const card = screen.getByText('Bún chả').closest('li')
    expect(card?.className).toContain('opacity-50')
  })

  it('shows an empty-state message when there are no categories', () => {
    render(<MenuList menu={{ categories: [] }} />)
    expect(screen.getByText(/Thực đơn đang được cập nhật/)).toBeInTheDocument()
  })
})
