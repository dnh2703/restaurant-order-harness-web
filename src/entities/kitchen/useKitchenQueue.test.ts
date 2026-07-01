import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { KitchenQueueItem, ServedItem } from './model'

vi.mock('./useKitchenStream', () => ({ useKitchenStream: vi.fn() }))
vi.mock('@/shared/api/kitchen', () => ({ advanceOrderItemStatus: vi.fn() }))

import { useKitchenStream } from './useKitchenStream'
import { advanceOrderItemStatus } from '@/shared/api/kitchen'
import { useKitchenQueue } from './useKitchenQueue'

const p1: KitchenQueueItem = {
  id: 'p1',
  tableName: 'Bàn 1',
  nameSnapshot: 'Phở',
  quantity: 1,
  note: null,
  status: 'PENDING',
  createdAt: 't',
  options: [],
}
const c1: KitchenQueueItem = { ...p1, id: 'c1', status: 'COOKING' }

function mockStream(queue: KitchenQueueItem[], served: ServedItem[] = []) {
  vi.mocked(useKitchenStream).mockReturnValue({
    queue,
    served,
    mode: 'live',
    refetch: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(advanceOrderItemStatus).mockResolvedValue(undefined)
})

describe('useKitchenQueue', () => {
  it('moves a card to the next column immediately on advance', async () => {
    mockStream([p1])
    const { result } = renderHook(() => useKitchenQueue('r1'))
    expect(result.current.pending).toHaveLength(1)
    expect(result.current.cooking).toHaveLength(0)

    await act(async () => {
      await result.current.advance('p1', 'COOKING')
    })

    expect(result.current.pending).toHaveLength(0)
    expect(result.current.cooking).toHaveLength(1)
    expect(advanceOrderItemStatus).toHaveBeenCalledWith({ data: { id: 'p1', status: 'COOKING' } })
  })

  it('optimistically moves a cooking card to served', async () => {
    mockStream([c1])
    const { result } = renderHook(() => useKitchenQueue('r1'))
    await act(async () => {
      await result.current.advance('c1', 'SERVED')
    })
    expect(result.current.cooking).toHaveLength(0)
    expect(result.current.served.map((s) => s.id)).toContain('c1')
  })

  it('rolls back and rejects when the API fails', async () => {
    mockStream([p1])
    vi.mocked(advanceOrderItemStatus).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useKitchenQueue('r1'))

    await act(async () => {
      await expect(result.current.advance('p1', 'COOKING')).rejects.toThrow('boom')
    })

    expect(result.current.pending).toHaveLength(1)
    expect(result.current.cooking).toHaveLength(0)
  })

  it('prunes the override once the server reflects the new status', async () => {
    mockStream([p1])
    const { result, rerender } = renderHook(() => useKitchenQueue('r1'))
    await act(async () => {
      await result.current.advance('p1', 'COOKING')
    })
    expect(result.current.cooking).toHaveLength(1)

    // Server catches up: p1 is now COOKING.
    mockStream([{ ...p1, status: 'COOKING' }])
    rerender()

    await waitFor(() => expect(result.current.cooking).toHaveLength(1))
    // No duplicate; override pruned, still exactly one cooking card.
    expect(result.current.cooking).toHaveLength(1)
  })

  it('dedupes optimistic served against the server served list by id', async () => {
    const served: ServedItem = {
      id: 'c1',
      tableName: 'Bàn 1',
      nameSnapshot: 'Phở',
      quantity: 1,
      note: null,
      options: [],
      servedAt: 't',
    }
    mockStream([c1])
    const { result, rerender } = renderHook(() => useKitchenQueue('r1'))
    await act(async () => {
      await result.current.advance('c1', 'SERVED')
    })
    // Server catches up: c1 left the queue and appears in served.
    mockStream([], [served])
    rerender()
    await waitFor(() => expect(result.current.served.filter((s) => s.id === 'c1')).toHaveLength(1))
  })
})
