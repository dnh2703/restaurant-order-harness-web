import { describe, it, expect, vi, beforeEach } from 'vitest'
import { doLogin, doGetSession, doLogout, type TokenStore } from '@/shared/lib/staff-auth.server'

function fakeStore(
  initial: { access?: string; refresh?: string } = {},
): TokenStore & { saved: string[]; cleared: number } {
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

const user = {
  id: 'u1',
  email: 'kitchen@demo.test',
  name: 'Đầu Bếp',
  role: 'KITCHEN',
  restaurantId: 'r1',
}

beforeEach(() => vi.restoreAllMocks())

describe('doLogin', () => {
  it('saves tokens and returns the user on success', async () => {
    const store = fakeStore()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: { accessToken: 'A', refreshToken: 'R', user } }),
    )
    const result = await doLogin(store, { email: user.email, password: 'pw' })
    expect(result).toEqual(user)
    expect(store.saved).toContain('A')
  })

  it('throws a friendly message on 401', async () => {
    const store = fakeStore()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: {} }, 401))
    await expect(doLogin(store, { email: 'x', password: 'y' })).rejects.toThrow(
      'Email hoặc mật khẩu không đúng',
    )
  })
})

describe('doGetSession', () => {
  it('returns the user from /auth/me', async () => {
    const store = fakeStore({ access: 'A', refresh: 'R' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ data: { user } }))
    expect(await doGetSession(store)).toEqual(user)
  })

  it('returns null when unauthenticated', async () => {
    const store = fakeStore({})
    expect(await doGetSession(store)).toBeNull()
  })

  it('re-throws non-Unauthenticated errors', async () => {
    const store = fakeStore({ access: 'A', refresh: 'R' })
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    await expect(doGetSession(store)).rejects.toThrow('network down')
  })
})

describe('doLogout', () => {
  it('revokes the refresh token and clears the store', async () => {
    const store = fakeStore({ access: 'A', refresh: 'R' })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))
    await doLogout(store)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(store.cleared).toBe(1)
  })
})
