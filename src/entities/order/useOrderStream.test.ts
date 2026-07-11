// src/entities/order/useOrderStream.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useOrderStream } from './useOrderStream'

vi.mock('@/shared/api/order', () => ({
  getOrder: vi.fn(),
}))
import { getOrder } from '@/shared/api/order'

const ORDER = {
  id: 'o1',
  status: 'OPEN',
  subtotal: 50000,
  discountAmount: 0,
  total: 50000,
  openedAt: '2026-06-29T10:00:00Z',
  items: [
    {
      id: 'it1',
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

beforeEach(() => {
  vi.mocked(getOrder).mockResolvedValue(ORDER as never)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useOrderStream', () => {
  it('loads the order on mount and stays in polling mode', async () => {
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.order?.id).toBe('o1'))
    expect(result.current.mode).toBe('polling')
  })

  it('polls the order again every 2.5s', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useOrderStream('tok'))
    await vi.waitFor(() => expect(result.current.order?.id).toBe('o1'))
    vi.mocked(getOrder).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(getOrder).toHaveBeenCalledTimes(1)
  })

  it('stops polling once unmounted', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useOrderStream('tok'))
    await vi.waitFor(() => expect(result.current.order?.id).toBe('o1'))
    unmount()
    vi.mocked(getOrder).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(getOrder).not.toHaveBeenCalled()
  })

  it('reports error when the initial load fails', async () => {
    vi.mocked(getOrder).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.mode).toBe('error'))
  })
})
