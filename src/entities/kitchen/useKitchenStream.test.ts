import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('@/shared/api/kitchen', () => ({
  fetchKitchenQueue: vi.fn(() =>
    Promise.resolve([
      {
        id: 'oi1',
        tableName: 'Bàn 5',
        nameSnapshot: 'Phở',
        quantity: 1,
        note: null,
        status: 'PENDING',
        createdAt: 't',
        options: [],
      },
    ]),
  ),
  fetchServedRecent: vi.fn(() => Promise.resolve([])),
}))

import { fetchKitchenQueue } from '@/shared/api/kitchen'
import { useKitchenStream } from './useKitchenStream'

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())

describe('useKitchenStream', () => {
  it('loads the queue on mount', async () => {
    const { result } = renderHook(() => useKitchenStream('r1'))
    await waitFor(() => expect(result.current.queue).toHaveLength(1))
    expect(fetchKitchenQueue).toHaveBeenCalled()
    expect(result.current.queue[0]!.nameSnapshot).toBe('Phở')
    expect(result.current.mode).toBe('polling')
  })

  it('polls again every 2.5s and stops on unmount', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useKitchenStream('r1'))
    await vi.waitFor(() => expect(result.current.queue).toHaveLength(1))
    vi.mocked(fetchKitchenQueue).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(fetchKitchenQueue).toHaveBeenCalledTimes(1)

    unmount()
    vi.mocked(fetchKitchenQueue).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchKitchenQueue).not.toHaveBeenCalled()
  })
})
