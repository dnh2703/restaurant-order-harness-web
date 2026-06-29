// src/widgets/order-tracker/OrderTracker.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderTracker } from './OrderTracker'
import type { Order } from '@/entities/order/model'

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
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText('Đang nấu')).toBeInTheDocument()
    expect(screen.getByText('Đã phục vụ')).toBeInTheDocument()
    expect(screen.getByText(/Ít hành/)).toBeInTheDocument()
    expect(screen.getByText(/95[.,]000đ/)).toBeInTheDocument()
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
})
