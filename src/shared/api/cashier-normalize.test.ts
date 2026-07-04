import { describe, it, expect } from 'vitest'
import { normalizeCashierTable, normalizeBillDetail } from './cashier-normalize'

describe('normalizeCashierTable', () => {
  it('coerces string money fields to numbers', () => {
    const row = normalizeCashierTable({
      orderId: 'o1',
      tableId: 't1',
      tableName: 'Bàn 5',
      subtotal: '410000',
      discountAmount: '0',
      total: '410000',
      openedAt: '2026-07-04T10:00:00Z',
      itemCount: '4',
    })
    expect(row).toEqual({
      orderId: 'o1',
      tableId: 't1',
      tableName: 'Bàn 5',
      subtotal: 410000,
      discountAmount: 0,
      total: 410000,
      openedAt: '2026-07-04T10:00:00Z',
      itemCount: 4,
    })
  })
})

describe('normalizeBillDetail', () => {
  it('maps id -> orderId and normalizes items + options', () => {
    const bill = normalizeBillDetail({
      id: 'o1',
      status: 'OPEN',
      subtotal: '190000',
      discountAmount: '10000',
      discountReason: 'Khách quen',
      total: '180000',
      openedAt: '2026-07-04T10:00:00Z',
      items: [
        {
          id: 'i1',
          nameSnapshot: 'Phở bò',
          unitPrice: '90000',
          quantity: '2',
          note: null,
          status: 'SERVED',
          options: [{ optionName: 'Tái', priceDelta: '0' }],
        },
      ],
    })
    expect(bill.orderId).toBe('o1')
    expect(bill.discountReason).toBe('Khách quen')
    expect(bill.total).toBe(180000)
    expect(bill.items[0]).toEqual({
      id: 'i1',
      nameSnapshot: 'Phở bò',
      unitPrice: 90000,
      quantity: 2,
      note: null,
      status: 'SERVED',
      options: [{ optionName: 'Tái', priceDelta: 0 }],
    })
  })

  it('defaults missing discountReason and options to null / []', () => {
    const bill = normalizeBillDetail({
      id: 'o2',
      status: 'OPEN',
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      openedAt: '2026-07-04T10:00:00Z',
      items: [
        { id: 'i9', nameSnapshot: 'Trà đá', unitPrice: 5000, quantity: 1, status: 'PENDING' },
      ],
    })
    expect(bill.discountReason).toBeNull()
    const item = bill.items[0]!
    expect(item.options).toEqual([])
    expect(item.note).toBeNull()
  })

  it('unwraps the { order } envelope the cashier bill endpoint returns', () => {
    // GET /api/cashier/orders/:id responds with { data: { order: {...} } }; after
    // readData strips `data`, the normalizer still receives the `{ order }` wrapper.
    const bill = normalizeBillDetail({
      order: {
        id: 'o1',
        status: 'OPEN',
        subtotal: '577000',
        discountAmount: '0',
        total: '577000',
        openedAt: '2026-06-28T18:00:58.540Z',
        items: [
          {
            id: 'i1',
            nameSnapshot: 'Phở bò',
            unitPrice: '50000',
            quantity: '4',
            note: null,
            status: 'SERVED',
            options: [],
          },
        ],
      },
    })
    expect(bill.orderId).toBe('o1')
    expect(bill.subtotal).toBe(577000)
    expect(bill.total).toBe(577000)
    expect(bill.items).toHaveLength(1)
    expect(bill.items[0]?.nameSnapshot).toBe('Phở bò')
  })
})
