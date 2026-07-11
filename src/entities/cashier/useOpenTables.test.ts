import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
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

import { getOpenTables } from '@/shared/api/cashier'

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())

describe('useOpenTables', () => {
  it('loads the open tables on mount', async () => {
    const { result } = renderHook(() => useOpenTables('r1'))
    await waitFor(() => expect(result.current.tables).toHaveLength(1))
    expect(result.current.tables[0]!.tableName).toBe('Bàn 5')
    expect(result.current.mode).toBe('polling')
  })

  it('polls again every 2.5s and stops on unmount', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useOpenTables('r1'))
    await vi.waitFor(() => expect(result.current.tables).toHaveLength(1))
    vi.mocked(getOpenTables).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(getOpenTables).toHaveBeenCalledTimes(1)

    unmount()
    vi.mocked(getOpenTables).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(getOpenTables).not.toHaveBeenCalled()
  })
})
