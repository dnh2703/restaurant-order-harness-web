import { createServerFn } from '@tanstack/react-start'
import { API_BASE_URL } from '@/shared/config'
import {
  authedFetch,
  cookieTokenStore,
  type TokenStore,
  Unauthenticated,
} from '@/shared/lib/staff-auth.server'
import type { StaffUser } from '@/entities/staff/model'

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

export const loginStaff = createServerFn({ method: 'POST' })
  .validator((d: Credentials) => d)
  .handler(({ data }): Promise<StaffUser> => doLogin(cookieTokenStore, data))

export const getStaffSession = createServerFn({ method: 'GET' }).handler(
  (): Promise<StaffUser | null> => doGetSession(cookieTokenStore),
)

export const logoutStaff = createServerFn({ method: 'POST' }).handler((): Promise<void> =>
  doLogout(cookieTokenStore),
)
