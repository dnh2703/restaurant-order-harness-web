import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/entities/kitchen', () => ({
  useKitchenStream: vi.fn(() => ({
    queue: [
      {
        id: 'p1',
        tableName: 'Bàn 5',
        nameSnapshot: 'Phở',
        quantity: 1,
        note: null,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        options: [],
      },
    ],
    served: [],
    mode: 'live',
    refetch: vi.fn(),
  })),
}))
vi.mock('@/shared/api/kitchen', () => ({
  advanceOrderItemStatus: vi.fn(() => Promise.resolve()),
  listMenuItemsForKitchen: vi.fn(() =>
    Promise.resolve([{ id: 'm1', name: 'Phở bò', isAvailable: true }]),
  ),
  setMenuItemAvailability: vi.fn(() => Promise.resolve()),
}))

import { KitchenScreenPage } from './KitchenScreenPage'
import { advanceOrderItemStatus, listMenuItemsForKitchen } from '@/shared/api/kitchen'

const user = {
  id: 'u1',
  email: 'kitchen@demo.test',
  name: 'Đầu Bếp',
  role: 'KITCHEN' as const,
  restaurantId: 'r1',
}

beforeEach(() => vi.clearAllMocks())

describe('KitchenScreenPage', () => {
  it('renders the header and queue', () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    expect(screen.getByText('Màn hình bếp')).toBeInTheDocument()
    expect(screen.getByText(/Chờ làm \(1\)/)).toBeInTheDocument()
  })

  it('advancing a pending item calls advanceOrderItemStatus', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    await waitFor(() =>
      expect(advanceOrderItemStatus).toHaveBeenCalledWith({
        data: { id: 'p1', status: 'COOKING' },
      }),
    )
  })

  it('opening the sold-out panel loads menu items', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Hết món/ }))
    await waitFor(() => expect(listMenuItemsForKitchen).toHaveBeenCalled())
  })
})
