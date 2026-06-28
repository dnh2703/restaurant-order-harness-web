import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomerMenuPage } from './CustomerMenuPage'
import type { Menu } from '@/entities/menu/model'
import type { TableContext } from '@/entities/table/model'

vi.mock('@/shared/api/order', () => ({
  submitOrderItems: vi.fn(() => Promise.resolve({ id: 'o1', total: 50000 })),
}))
import { submitOrderItems } from '@/shared/api/order'

const context: TableContext = {
  restaurant: { name: 'Bếp Mộc' },
  table: { id: 't1', name: 'Bàn 12', status: 'OCCUPIED' },
  session: { orderId: 'o1', status: 'OPEN', openedAt: '2026-06-28T10:00:00Z' },
}
const menu: Menu = {
  categories: [
    {
      id: 'c1',
      name: 'Món chính',
      items: [
        {
          id: 'i1',
          name: 'Phở bò',
          description: null,
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
          isAvailable: true,
          optionGroups: [],
        },
      ],
    },
  ],
}

function setup(search = { q: '', cat: 'all' }) {
  const onSearchChange = vi.fn()
  render(
    <CustomerMenuPage
      context={context}
      menu={menu}
      search={search}
      onSearchChange={onSearchChange}
      qrToken="tok"
    />,
  )
  return { onSearchChange }
}

beforeEach(() => vi.clearAllMocks())

describe('CustomerMenuPage', () => {
  it('renders nav, menu and cart', () => {
    setup()
    expect(screen.getByText('Bếp Mộc')).toBeInTheDocument()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getAllByText('Giỏ của bạn').length).toBeGreaterThan(0)
  })
  it('typing in search calls onSearchChange', () => {
    const { onSearchChange } = setup()
    fireEvent.change(screen.getByPlaceholderText('Tìm món…'), { target: { value: 'pho' } })
    expect(onSearchChange).toHaveBeenCalledWith({ q: 'pho' })
  })
  it('applies the search filter from props', () => {
    setup({ q: 'pho', cat: 'all' })
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.queryByText('Bún chả')).not.toBeInTheDocument()
  })
  it('adding a dish updates the cart total', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    expect(screen.getAllByRole('button', { name: /Gửi bếp/ })[0]!).toHaveTextContent(/50[.,]000đ/)
  })
  it('submits the cart and shows a confirmation, then clears', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    fireEvent.click(screen.getAllByRole('button', { name: /Gửi bếp/ })[0]!)
    expect(submitOrderItems).toHaveBeenCalledWith({
      data: { qrToken: 'tok', items: [{ menuItemId: 'i1', quantity: 1 }] },
    })
    expect(await screen.findByText(/Đã gửi/)).toBeInTheDocument()
  })
})
