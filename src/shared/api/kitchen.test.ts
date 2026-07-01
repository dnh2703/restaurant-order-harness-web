import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchQueue, fetchServed, advanceItem, setAvailability } from './kitchen.server'
import type { TokenStore } from '@/shared/lib/staff-auth.server'

function fakeStore(): TokenStore {
  return {
    getAccess: () => 'A',
    getRefresh: () => 'R',
    save: () => {},
    clear: () => {},
  }
}
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => vi.restoreAllMocks())

describe('fetchQueue', () => {
  it('normalizes the queue items', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        data: {
          items: [
            {
              id: 'oi1',
              tableName: 'Bàn 5',
              nameSnapshot: 'Phở',
              quantity: '2',
              note: null,
              status: 'PENDING',
              createdAt: 't',
              options: [],
            },
          ],
        },
      }),
    )
    const items = await fetchQueue(fakeStore())
    expect(items).toHaveLength(1)
    expect(items[0]!.quantity).toBe(2)
  })
})

describe('fetchServed', () => {
  it('returns [] when the endpoint errors (graceful degradation)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: {} }, 404))
    expect(await fetchServed(fakeStore())).toEqual([])
  })
})

describe('advanceItem', () => {
  it('PATCHes the new status', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { item: { id: 'oi1', status: 'COOKING' } } }))
    await advanceItem(fakeStore(), { id: 'oi1', status: 'COOKING' })
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ status: 'COOKING' })
  })

  it('throws on a failed transition', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: {} }, 409))
    await expect(advanceItem(fakeStore(), { id: 'oi1', status: 'SERVED' })).rejects.toThrow()
  })
})

describe('setAvailability', () => {
  it('PATCHes isAvailable', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { item: { id: 'm1', isAvailable: false } } }))
    await setAvailability(fakeStore(), { id: 'm1', isAvailable: false })
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({ isAvailable: false })
  })
})
