import { describe, it, expect } from 'vitest'
import { normalizeOrder } from './normalize'

describe('normalizeOrder', () => {
  it('coerces money fields (including integer-strings) to numbers', () => {
    const order = normalizeOrder({
      id: 'o1',
      status: 'OPEN',
      subtotal: '50000',
      discountAmount: 0,
      total: '50000',
      openedAt: '2026-06-29T10:00:00Z',
      items: [
        {
          id: 'it1',
          menuItemId: 'm1',
          nameSnapshot: 'Phở bò',
          unitPrice: '50000',
          quantity: 1,
          note: null,
          status: 'PENDING',
          createdAt: '2026-06-29T10:00:00Z',
          options: [{ optionName: 'Tái', priceDelta: '0' }],
        },
      ],
    })
    expect(order.total).toBe(50000)
    expect(order.items[0].unitPrice).toBe(50000)
    expect(order.items[0].options[0].priceDelta).toBe(0)
    expect(order.items[0].status).toBe('PENDING')
  })

  it('defaults a missing items array to empty', () => {
    const order = normalizeOrder({
      id: 'o1',
      status: 'OPEN',
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      openedAt: '2026-06-29T10:00:00Z',
      items: undefined,
    })
    expect(order.items).toEqual([])
  })
})
