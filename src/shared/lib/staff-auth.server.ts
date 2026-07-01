import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { API_BASE_URL } from '@/shared/config'
import type { StaffUser } from '@/shared/api/types/staff'

const ACCESS_COOKIE = 'staff_at'
const REFRESH_COOKIE = 'staff_rt'

export interface TokenStore {
  getAccess(): string | undefined
  getRefresh(): string | undefined
  save(access: string, refresh: string): void
  clear(): void
}

/** Cookie-backed token store. httpOnly so tokens never reach client JS. */
export const cookieTokenStore: TokenStore = {
  getAccess: () => getCookie(ACCESS_COOKIE),
  getRefresh: () => getCookie(REFRESH_COOKIE),
  save(access, refresh) {
    const base = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    }
    setCookie(ACCESS_COOKIE, access, { ...base, maxAge: 60 * 60 })
    setCookie(REFRESH_COOKIE, refresh, { ...base, maxAge: 60 * 60 * 24 * 30 })
  },
  clear() {
    deleteCookie(ACCESS_COOKIE, { path: '/' })
    deleteCookie(REFRESH_COOKIE, { path: '/' })
  },
}

/** Thrown when the session cannot be established or refreshed. */
export class Unauthenticated extends Error {
  constructor() {
    super('Unauthenticated')
    this.name = 'Unauthenticated'
  }
}

async function refreshAccess(store: TokenStore): Promise<string> {
  const refreshToken = store.getRefresh()
  if (!refreshToken) {
    store.clear()
    throw new Unauthenticated()
  }
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) {
    store.clear()
    throw new Unauthenticated()
  }
  const json = (await res.json()) as { data: { accessToken: string; refreshToken: string } }
  store.save(json.data.accessToken, json.data.refreshToken)
  return json.data.accessToken
}

/**
 * Fetch a BE path with the staff Bearer token, refreshing once on 401.
 * `store` is injected so the retry logic is unit-testable without cookies.
 */
export async function authedFetch(
  store: TokenStore,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = store.getAccess()
  if (!token) token = await refreshAccess(store)

  const call = (bearer: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), authorization: `Bearer ${bearer}` },
    })

  let res = await call(token)
  if (res.status === 401) {
    const fresh = await refreshAccess(store)
    res = await call(fresh)
    if (res.status === 401) {
      store.clear()
      throw new Unauthenticated()
    }
  }
  return res
}

interface Credentials {
  email: string
  password: string
}

/** Server-only login: store tokens, return the staff user. Exported for tests. */
export async function doLogin(store: TokenStore, creds: Credentials): Promise<StaffUser> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(creds),
  })
  if (!res.ok) {
    throw new Error(
      res.status === 401 ? 'Email hoặc mật khẩu không đúng' : `Đăng nhập thất bại (${res.status})`,
    )
  }
  const json = (await res.json()) as {
    data: { accessToken: string; refreshToken: string; user: StaffUser }
  }
  store.save(json.data.accessToken, json.data.refreshToken)
  return json.data.user
}

/** Server-only: resolve the current staff session (refresh-on-401), or null. Exported for tests. */
export async function doGetSession(store: TokenStore): Promise<StaffUser | null> {
  try {
    const res = await authedFetch(store, '/api/auth/me')
    if (!res.ok) return null
    const json = (await res.json()) as { data: { user: StaffUser } }
    return json.data.user
  } catch (err) {
    if (err instanceof Unauthenticated) return null
    throw err
  }
}

/** Server-only: revoke the refresh token and clear cookies. Exported for tests. */
export async function doLogout(store: TokenStore): Promise<void> {
  const refreshToken = store.getRefresh()
  if (refreshToken) {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  store.clear()
}
