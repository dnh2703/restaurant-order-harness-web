import { describe, it, expect } from 'vitest'
import { normalizeQueueItem, normalizeServedItem } from './model'

describe('normalizeQueueItem', () => {
  it('coerces string quantity/priceDelta to numbers and defaults note/options', () => {
    const item = normalizeQueueItem({
      id: 'oi1',
      tableName: 'Bàn 5',
      nameSnapshot: 'Phở bò',
      quantity: '2',
      note: null,
      status: 'PENDING',
      createdAt: '2026-06-30T10:00:00Z',
      options: [{ optionName: 'Thêm trứng', priceDelta: '5000' }],
    })
    expect(item.quantity).toBe(2)
    expect(item.options).toEqual([{ optionName: 'Thêm trứng', priceDelta: 5000 }])
    expect(item.note).toBeNull()
  })

  it('tolerates a missing options array', () => {
    const item = normalizeQueueItem({
      id: 'oi2',
      tableName: 'Bàn 1',
      nameSnapshot: 'Bún',
      quantity: 1,
      note: 'ít hành',
      status: 'COOKING',
      createdAt: '2026-06-30T10:01:00Z',
    })
    expect(item.options).toEqual([])
    expect(item.note).toBe('ít hành')
  })
})

describe('normalizeServedItem', () => {
  it('maps servedAt and options', () => {
    const item = normalizeServedItem({
      id: 'oi3',
      tableName: 'Bàn 4',
      nameSnapshot: 'Gỏi cuốn',
      quantity: '2',
      note: null,
      status: 'SERVED',
      servedAt: '2026-06-30T10:05:00Z',
      options: [],
    })
    expect(item.servedAt).toBe('2026-06-30T10:05:00Z')
    expect(item.quantity).toBe(2)
  })
})
