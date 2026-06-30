import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authedFetch, Unauthenticated, type TokenStore } from './staff-auth.server'

function fakeStore(initial: {
  access?: string
  refresh?: string
}): TokenStore & { saved: string[]; cleared: number } {
  let access = initial.access
  let refresh = initial.refresh
  const saved: string[] = []
  let cleared = 0
  return {
    saved,
    get cleared() {
      return cleared
    },
    getAccess: () => access,
    getRefresh: () => refresh,
    save: (a: string, r: string) => {
      access = a
      refresh = r
      saved.push(a)
    },
    clear: () => {
      access = undefined
      refresh = undefined
      cleared++
    },
  } as TokenStore & { saved: string[]; cleared: number }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('authedFetch', () => {
  it('attaches the Bearer access token', async () => {
    const store = fakeStore({ access: 'A1', refresh: 'R1' })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: { ok: true } }))
    const res = await authedFetch(store, '/api/kitchen/queue')
    expect(res.status).toBe(200)
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer A1')
  })

  it('refreshes once on 401 then retries with the new token', async () => {
    const store = fakeStore({ access: 'OLD', refresh: 'R1' })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 401)) // first protected call
      .mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'NEW', refreshToken: 'R2' } })) // refresh
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } })) // retry
    const res = await authedFetch(store, '/api/kitchen/queue')
    expect(res.status).toBe(200)
    expect(store.saved).toContain('NEW')
    const retryHeaders = (fetchMock.mock.calls[2][1] as RequestInit).headers as Record<
      string,
      string
    >
    expect(retryHeaders.authorization).toBe('Bearer NEW')
  })

  it('clears tokens and throws Unauthenticated when refresh fails', async () => {
    const store = fakeStore({ access: 'OLD', refresh: 'R1' })
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 401)) // protected call
      .mockResolvedValueOnce(jsonResponse({ error: {} }, 401)) // refresh rejected
    await expect(authedFetch(store, '/api/kitchen/queue')).rejects.toBeInstanceOf(Unauthenticated)
    expect(store.cleared).toBe(1)
  })

  it('refreshes proactively when there is no access token', async () => {
    const store = fakeStore({ refresh: 'R1' })
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'NEW', refreshToken: 'R2' } })) // refresh
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } })) // protected call
    const res = await authedFetch(store, '/api/auth/me')
    expect(res.status).toBe(200)
    expect(store.saved).toContain('NEW')
  })

  it('throws Unauthenticated with neither token present', async () => {
    const store = fakeStore({})
    await expect(authedFetch(store, '/api/auth/me')).rejects.toBeInstanceOf(Unauthenticated)
  })
})
