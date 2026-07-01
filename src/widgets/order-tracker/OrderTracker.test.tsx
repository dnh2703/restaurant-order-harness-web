// src/widgets/order-tracker/OrderTracker.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderTracker } from './OrderTracker'
import type { Order } from '@/entities/order'

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    status: 'OPEN',
    subtotal: 95000,
    discountAmount: 0,
    total: 95000,
    openedAt: '2026-06-29T10:00:00Z',
    items: [
      {
        id: 'a',
        menuItemId: 'm1',
        nameSnapshot: 'Phở bò',
        unitPrice: 50000,
        quantity: 1,
        note: 'Ít hành',
        status: 'COOKING',
        createdAt: '2026-06-29T10:00:00Z',
        options: [{ optionName: 'Tái', priceDelta: 0 }],
      },
      {
        id: 'b',
        menuItemId: 'm2',
        nameSnapshot: 'Bún chả',
        unitPrice: 45000,
        quantity: 1,
        note: null,
        status: 'SERVED',
        createdAt: '2026-06-29T10:01:00Z',
        options: [],
      },
    ],
    ...over,
  }
}

describe('OrderTracker', () => {
  it('renders each item with its status label, note and total', () => {
    render(<OrderTracker order={makeOrder()} mode="live" />)
    // Item name is rendered as "1× Phở bò" in a single node with aria-label="1 Phở bò"
    expect(screen.getByText((_, el) => el?.textContent === '1× Phở bò')).toBeInTheDocument()
    expect(screen.getByText('Đang nấu')).toBeInTheDocument()
    expect(screen.getByText('Đã phục vụ')).toBeInTheDocument()
    expect(screen.getByText(/Ít hành/)).toBeInTheDocument()
    // Assert total via testid — precise, no ambiguity with subtotal
    expect(screen.getByTestId('order-total')).toHaveTextContent(/95[.,]000đ/)
  })

  it('always shows the subtotal row even when there is no discount', () => {
    render(
      <OrderTracker
        order={makeOrder({ discountAmount: 0, subtotal: 95000, total: 95000 })}
        mode="live"
      />,
    )
    expect(screen.getByText('Tạm tính')).toBeInTheDocument()
    // Subtotal value appears in the subtotal row (not just the total row)
    const subtotalRow = screen.getByText('Tạm tính').closest('div')
    expect(subtotalRow).toHaveTextContent(/95[.,]000đ/)
    // Discount row must NOT appear when discountAmount is 0
    expect(screen.queryByText('Giảm giá')).not.toBeInTheDocument()
  })

  it('shows both subtotal and discount rows when a discount is applied', () => {
    render(
      <OrderTracker
        order={makeOrder({ subtotal: 95000, discountAmount: 10000, total: 85000 })}
        mode="live"
      />,
    )
    expect(screen.getByText('Tạm tính')).toBeInTheDocument()
    expect(screen.getByText('Giảm giá')).toBeInTheDocument()
    expect(screen.getByTestId('order-total')).toHaveTextContent(/85[.,]000đ/)
  })

  it('exposes item quantity to assistive technology via aria-label', () => {
    render(<OrderTracker order={makeOrder()} mode="live" />)
    expect(screen.getByLabelText('1 Phở bò')).toBeInTheDocument()
  })

  it('shows the live indicator in live mode', () => {
    render(<OrderTracker order={makeOrder()} mode="live" />)
    expect(screen.getByText('Đang cập nhật trực tiếp')).toBeInTheDocument()
  })

  it('shows the syncing indicator in polling mode', () => {
    render(<OrderTracker order={makeOrder()} mode="polling" />)
    expect(screen.getByText('Đang đồng bộ…')).toBeInTheDocument()
  })

  it('renders the empty state when there are no items', () => {
    render(<OrderTracker order={makeOrder({ items: [] })} mode="live" />)
    expect(screen.getByText('Chưa có món nào')).toBeInTheDocument()
  })

  it('renders CANCELLED item with struck-through style', () => {
    render(
      <OrderTracker
        order={makeOrder({
          items: [
            {
              id: 'c',
              menuItemId: 'm3',
              nameSnapshot: 'Gỏi cuốn',
              unitPrice: 35000,
              quantity: 2,
              note: null,
              status: 'CANCELLED',
              createdAt: '2026-06-29T10:02:00Z',
              options: [],
            },
          ],
        })}
        mode="live"
      />,
    )
    const item = screen.getByLabelText('2 Gỏi cuốn')
    expect(item).toHaveClass('line-through')
    expect(screen.getByText('Đã hủy')).toBeInTheDocument()
  })

  it('renders the backLink in empty state', () => {
    render(
      <OrderTracker
        order={makeOrder({ items: [] })}
        mode="live"
        backLink={<a href="/menu">Xem thực đơn</a>}
      />,
    )
    expect(screen.getByRole('link', { name: 'Xem thực đơn' })).toBeInTheDocument()
  })
})
