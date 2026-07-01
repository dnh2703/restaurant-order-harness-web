import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// vi.mock is hoisted above imports, so shared spies must be created with vi.hoisted.
const { advance } = vi.hoisted(() => ({ advance: vi.fn(() => Promise.resolve()) }))

vi.mock('@/entities/kitchen', () => ({
  useKitchenQueue: vi.fn(() => ({
    pending: [
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
    cooking: [],
    served: [],
    mode: 'live',
    advance,
  })),
}))
vi.mock('@/shared/api/kitchen', () => ({
  listMenuItemsForKitchen: vi.fn(() =>
    Promise.resolve([{ id: 'm1', name: 'Phở bò', isAvailable: true }]),
  ),
  setMenuItemAvailability: vi.fn(() => Promise.resolve()),
}))
vi.mock('@/shared/ui', async (importActual) => {
  const actual = await importActual<typeof import('@/shared/ui')>()
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } }
})
// Neutralise DnD wrappers so draggable divs don't get role="button" and
// cause getByRole('button', { name: /Bắt đầu/ }) to find multiple elements.
vi.mock('@dnd-kit/core', async (importActual) => {
  const actual = await importActual<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      isDragging: false,
    }),
  }
})

import { KitchenScreenPage } from './KitchenScreenPage'
import { listMenuItemsForKitchen } from '@/shared/api/kitchen'
import { toast } from '@/shared/ui'

const user = {
  id: 'u1',
  email: 'kitchen@demo.test',
  name: 'Đầu Bếp',
  role: 'KITCHEN' as const,
  restaurantId: 'r1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KitchenScreenPage', () => {
  it('renders the header and the pending queue', () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    expect(screen.getByText('Màn hình bếp')).toBeInTheDocument()
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
  })

  it('advancing a pending item calls advance and shows a success toast', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    await waitFor(() => expect(advance).toHaveBeenCalledWith('p1', 'COOKING'))
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalled())
  })

  it('opening the sold-out panel loads menu items', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Hết món/ }))
    await waitFor(() => expect(vi.mocked(listMenuItemsForKitchen)).toHaveBeenCalled())
  })
})
