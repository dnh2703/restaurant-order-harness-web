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

// Controllable EventSource mock.
class MockEventSource {
  static instances: MockEventSource[] = []
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {}
  closed = false
  constructor(public url: string) {
    MockEventSource.instances.push(this)
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  emit(type: string) {
    for (const fn of this.listeners[type] ?? []) fn(new MessageEvent(type))
  }
  close() {
    this.closed = true
  }
}

beforeEach(() => {
  MockEventSource.instances = []
  vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
  vi.mocked(getOrder).mockResolvedValue(ORDER as never)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useOrderStream', () => {
  it('loads the order and reports live once the stream opens', async () => {
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.order?.id).toBe('o1'))
    act(() => MockEventSource.instances[0]!.onopen?.())
    expect(result.current.mode).toBe('live')
  })

  it('refetches the order on an order_item.updated event', async () => {
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.order?.id).toBe('o1'))
    vi.mocked(getOrder).mockClear()
    act(() => MockEventSource.instances[0]!.emit('order_item.updated'))
    await waitFor(() => expect(getOrder).toHaveBeenCalledTimes(1))
  })

  it('falls back to polling when the stream errors', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useOrderStream('tok'))
    await vi.waitFor(() => expect(result.current.order?.id).toBe('o1'))
    act(() => MockEventSource.instances[0]!.onerror?.())
    expect(result.current.mode).toBe('polling')
    vi.mocked(getOrder).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(getOrder).toHaveBeenCalled()
  })

  it('reports error when the initial load fails', async () => {
    vi.mocked(getOrder).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.mode).toBe('error'))
  })
})
