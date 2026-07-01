import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomerMenuPage } from './CustomerMenuPage'
import type { Menu } from '@/entities/menu'
import type { TableContext } from '@/entities/table'

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
        {
          id: 'i3',
          name: 'Trà sữa',
          description: null,
          price: 35000,
          imageUrl: null,
          isAvailable: true,
          optionGroups: [
            {
              id: 'g1',
              name: 'Size',
              type: 'SINGLE',
              isRequired: true,
              options: [
                { id: 'o-m', name: 'M', priceDelta: 0 },
                { id: 'o-l', name: 'L', priceDelta: 6000 },
              ],
            },
          ],
        },
      ],
    },
  ],
}

function setup(
  search = { q: '', cat: 'all' },
  extra: Partial<{ onSubmitted: () => void; onViewOrder: () => void }> = {},
) {
  const onSearchChange = vi.fn()
  render(
    <CustomerMenuPage
      context={context}
      menu={menu}
      search={search}
      onSearchChange={onSearchChange}
      qrToken="tok"
      onSubmitted={extra.onSubmitted}
      onViewOrder={extra.onViewOrder}
    />,
  )
  return { onSearchChange }
}

beforeEach(() => vi.clearAllMocks())

const openCart = () => fireEvent.click(screen.getByRole('button', { name: /Mở giỏ hàng/ }))

describe('CustomerMenuPage', () => {
  it('renders nav and menu', () => {
    setup()
    expect(screen.getByText('Bếp Mộc')).toBeInTheDocument()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
  })
  it('opens the cart drawer from the cart icon', async () => {
    setup()
    openCart()
    expect((await screen.findAllByText('Giỏ của bạn')).length).toBeGreaterThan(0)
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
  it('adding a dish updates the cart total', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    openCart()
    expect(await screen.findByRole('button', { name: /Gửi bếp/ })).toHaveTextContent(/50[.,]000đ/)
  })
  it('submits the cart and shows a confirmation, then clears', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    openCart()
    fireEvent.click(await screen.findByRole('button', { name: /Gửi bếp/ }))
    expect(submitOrderItems).toHaveBeenCalledWith({
      data: {
        qrToken: 'tok',
        items: [{ menuItemId: 'i1', quantity: 1, note: null, optionIds: [] }],
      },
    })
    expect(await screen.findByText(/Đã gửi/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gửi bếp/ })).toBeNull()
  })
  it('shows error and keeps cart when submitOrderItems rejects', async () => {
    vi.mocked(submitOrderItems).mockRejectedValueOnce(new Error('Gửi đơn thất bại'))
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    openCart()
    fireEvent.click(await screen.findByRole('button', { name: /Gửi bếp/ }))
    expect(await screen.findByText('Gửi đơn thất bại')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gửi bếp/ })).not.toBeNull()
  })
  it('calls onSubmitted after a successful submit', async () => {
    const onSubmitted = vi.fn()
    setup({ q: '', cat: 'all' }, { onSubmitted })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    openCart()
    fireEvent.click(await screen.findByRole('button', { name: /Gửi bếp/ }))
    await screen.findByText(/Đã gửi/)
    expect(onSubmitted).toHaveBeenCalled()
  })
  it('calls onViewOrder from the nav order button', () => {
    const onViewOrder = vi.fn()
    setup({ q: '', cat: 'all' }, { onViewOrder })
    fireEvent.click(screen.getByRole('button', { name: 'Xem đơn của bạn' }))
    expect(onViewOrder).toHaveBeenCalled()
  })
  it('adds a dish with options via the detail sheet and submits its optionIds + note', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Trà sữa' }))
    fireEvent.click(await screen.findByRole('radio', { name: /^L/ }))
    fireEvent.change(screen.getByPlaceholderText(/Ghi chú/), { target: { value: 'ít đá' } })
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/ }))
    // The sheet closes on add. happy-dom doesn't clear vaul's background
    // aria-hidden synchronously after a portal closes (it does in a real
    // browser), so reach the cart button and submit button including hidden.
    fireEvent.click(screen.getByRole('button', { name: /Mở giỏ hàng/, hidden: true }))
    fireEvent.click(await screen.findByRole('button', { name: /Gửi bếp/, hidden: true }))
    expect(submitOrderItems).toHaveBeenCalledWith({
      data: {
        qrToken: 'tok',
        items: [{ menuItemId: 'i3', quantity: 1, note: 'ít đá', optionIds: ['o-l'] }],
      },
    })
  })
})
