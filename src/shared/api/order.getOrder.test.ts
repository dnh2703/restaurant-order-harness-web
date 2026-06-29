import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchOrder } from './order'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchOrder', () => {
  it('normalizes the BE order payload', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
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
                options: [],
              },
            ],
          },
        }),
        { status: 200 },
      ),
    )
    const order = await fetchOrder('tok')
    expect(order.total).toBe(50000)
    expect(order.items[0]!.nameSnapshot).toBe('Phở bò')
  })

  it('throws a Vietnamese message on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 404 }))
    await expect(fetchOrder('tok')).rejects.toThrow('Phiên bàn không hợp lệ')
  })
})
