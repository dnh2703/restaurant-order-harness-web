import { describe, it, expect, vi, beforeEach } from 'vitest'

// The real cookie helpers read from the request and write to the response, which is exactly
// the staleness we are fixing. Mock them with a simple request-keyed cookie jar so we can
// prove the per-request overlay makes reads reflect the latest save/clear.
const state = {
  reqKey: {} as object,
  cookies: {} as Record<string, string | undefined>,
}

vi.mock('@tanstack/react-start/server', () => ({
  getCookie: (name: string) => state.cookies[name],
  // setCookie/deleteCookie only touch the *response* — they must NOT change what getCookie returns.
  setCookie: () => {},
  deleteCookie: () => {},
  getRequest: () => state.reqKey,
}))

// Imported after vi.mock so the module under test picks up the mocked helpers.
const { cookieTokenStore } = await import('./staff-auth.server')

beforeEach(() => {
  state.reqKey = {}
  state.cookies = {}
})

describe('cookieTokenStore per-request overlay', () => {
  it('returns freshly saved tokens within the same request instead of the stale cookie', () => {
    state.cookies = { staff_at: 'A_old', staff_rt: 'R_old' }
    expect(cookieTokenStore.getAccess()).toBe('A_old')

    cookieTokenStore.save('A_new', 'R_new')

    // The request Cookie header is still stale, but the overlay must reflect the save so that
    // later authed calls in the same SSR request reuse the rotated token instead of re-refreshing.
    expect(cookieTokenStore.getAccess()).toBe('A_new')
    expect(cookieTokenStore.getRefresh()).toBe('R_new')
  })

  it('reflects clear() within the same request', () => {
    state.cookies = { staff_at: 'A_old', staff_rt: 'R_old' }
    cookieTokenStore.clear()
    expect(cookieTokenStore.getAccess()).toBeUndefined()
    expect(cookieTokenStore.getRefresh()).toBeUndefined()
  })

  it('does not leak the overlay across different requests', () => {
    state.cookies = { staff_at: 'A_old', staff_rt: 'R_old' }
    cookieTokenStore.save('A_new', 'R_new')

    // A new request has its own key; its cookies come from the browser, not the prior overlay.
    state.reqKey = {}
    state.cookies = { staff_at: 'A_req2', staff_rt: 'R_req2' }
    expect(cookieTokenStore.getAccess()).toBe('A_req2')
    expect(cookieTokenStore.getRefresh()).toBe('R_req2')
  })
})
