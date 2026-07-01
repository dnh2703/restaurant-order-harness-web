// src/pages/customer-order/CustomerOrderPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CustomerOrderPage } from './CustomerOrderPage'

vi.mock('@/entities/order', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/order')>()
  return {
    ...actual,
    useOrderStream: vi.fn(),
  }
})
import { useOrderStream } from '@/entities/order'

const ORDER = {
  id: 'o1',
  status: 'OPEN',
  subtotal: 50000,
  discountAmount: 0,
  total: 50000,
  openedAt: '2026-06-29T10:00:00Z',
  items: [
    {
      id: 'a',
      menuItemId: 'm1',
      nameSnapshot: 'Phở bò',
      unitPrice: 50000,
      quantity: 1,
      note: null,
      status: 'PENDING',
      createdAt: '2026-06-29T10:00:00Z',
      options: [],
    },
  ],
}

beforeEach(() => vi.clearAllMocks())

describe('CustomerOrderPage', () => {
  it('shows a loading state before the order arrives', () => {
    vi.mocked(useOrderStream).mockReturnValue({ order: null, mode: 'polling', refetch: vi.fn() })
    render(<CustomerOrderPage qrToken="tok" />)
    expect(screen.getByText('Đang tải đơn…')).toBeInTheDocument()
  })

  it('shows an error state with a retry button', () => {
    const refetch = vi.fn()
    vi.mocked(useOrderStream).mockReturnValue({ order: null, mode: 'error', refetch })
    render(<CustomerOrderPage qrToken="tok" />)
    expect(screen.getByText('Không tải được đơn')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Thử lại' }).click()
    expect(refetch).toHaveBeenCalled()
  })

  it('renders the tracker once the order is loaded', () => {
    vi.mocked(useOrderStream).mockReturnValue({
      order: ORDER as never,
      mode: 'live',
      refetch: vi.fn(),
    })
    render(<CustomerOrderPage qrToken="tok" />)
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument()
  })
})
