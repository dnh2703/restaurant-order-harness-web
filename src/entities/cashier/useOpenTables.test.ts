import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOpenTables } from './useOpenTables'

const tables = [
  {
    orderId: 'o1',
    tableId: 't1',
    tableName: 'Bàn 5',
    subtotal: 410000,
    discountAmount: 0,
    total: 410000,
    openedAt: '2026-07-04T10:00:00Z',
    itemCount: 4,
  },
]

vi.mock('@/shared/api/cashier', () => ({
  getOpenTables: vi.fn(() => Promise.resolve(tables)),
}))

class FakeEventSource {
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  addEventListener() {}
  close() {}
}

beforeEach(() => {
  ;(globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource
})

describe('useOpenTables', () => {
  it('loads the open tables on mount', async () => {
    const { result } = renderHook(() => useOpenTables('r1'))
    await waitFor(() => expect(result.current.tables).toHaveLength(1))
    expect(result.current.tables[0]!.tableName).toBe('Bàn 5')
  })
})
