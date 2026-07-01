import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

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

// Minimal EventSource stub so the hook can construct one in happy-dom.
class FakeEventSource {
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  listeners: Record<string, () => void> = {}
  constructor(public url: string) {}
  addEventListener(type: string, cb: () => void) {
    this.listeners[type] = cb
  }
  close() {}
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource
})
afterEach(() => vi.restoreAllMocks())

describe('useKitchenStream', () => {
  it('loads the queue on mount', async () => {
    const { result } = renderHook(() => useKitchenStream('r1'))
    await waitFor(() => expect(result.current.queue).toHaveLength(1))
    expect(fetchKitchenQueue).toHaveBeenCalled()
    expect(result.current.queue[0]!.nameSnapshot).toBe('Phở')
  })
})
