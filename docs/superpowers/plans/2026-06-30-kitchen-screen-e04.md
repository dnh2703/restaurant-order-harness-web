# Kitchen Screen (E04) Implementation Plan — FE only

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the staff Kitchen Display (queue, status advance, sold-out) plus a thin staff-auth slice, wired to the existing Elysia BE.

**Architecture:** TanStack Start (FSD layers). Server functions proxy the BE (browser never calls BE directly); the access/refresh tokens live in httpOnly cookies set server-side. A `/kitchen` route is role-guarded (KITCHEN/ADMIN). The kitchen board reads `/api/kitchen/queue` + `/api/kitchen/served-recent`, refreshes on the staff SSE stream (proxied through the FE server with the Bearer token injected), and falls back to polling. UI is a 3-column board (`Chờ làm` / `Đang làm` / `Đã xong`).

**Tech Stack:** TanStack Start + Router (latest), React 19, Tailwind v4 + CVA, vaul Drawer, Vitest + Testing Library (happy-dom), Playwright.

## Global Constraints

- Money/number fields from the BE may be serialized as integer-strings — always coerce with `toNumber` from `@/shared/lib/format`.
- BE success envelope is `{ data: ... }`; errors are `{ error: { code, message } }`. HTTP `401` = unauthenticated, `403` = wrong role.
- BE base URL: `API_BASE_URL` from `@/shared/config` (`http://localhost:3000` default). Read it only inside server functions / server route handlers.
- Path alias `@` → `src` (configured in `vitest.config.ts` and `vite.config.ts`).
- Server-only modules use TanStack cookie/header helpers from `@tanstack/react-start/server` (`getCookie`, `setCookie`, `deleteCookie`).
- User-facing copy is Vietnamese (match existing pages).
- Verified BE facts: staff SSE event name is `order_item.updated` (data `{ orderItemId, orderId, status }`) plus `keep-alive`; `GET /api/stream/restaurant/:id` requires `:id === token.restaurantId` (else `403`); seeded kitchen login is `kitchen@demo.test` / `kitchen-password`; admin is `admin@demo.test` / `admin-password`.
- Run a single test file: `bunx vitest run <path>` (or `npx vitest run <path>`). Full suite: `npm test`. Type check: `npm run typecheck`.

---

### Task 1: Staff auth core (token store + authed fetch with refresh)

**Files:**
- Create: `src/entities/staff/model.ts`
- Create: `src/shared/lib/staff-auth.server.ts`
- Test: `src/shared/lib/staff-auth.server.test.ts`

**Interfaces:**
- Produces: `StaffUser`, `StaffRole` (entities/staff/model). `TokenStore` interface, `cookieTokenStore: TokenStore`, `class Unauthenticated extends Error`, `authedFetch(store: TokenStore, path: string, init?: RequestInit): Promise<Response>` (staff-auth.server).
- Consumes: `API_BASE_URL` from `@/shared/config`; cookie helpers from `@tanstack/react-start/server`.

- [ ] **Step 1: Write the staff model**

`src/entities/staff/model.ts`:
```ts
export type StaffRole = 'ADMIN' | 'KITCHEN' | 'CASHIER'

export interface StaffUser {
  id: string
  email: string
  name: string
  role: StaffRole
  restaurantId: string
}
```

- [ ] **Step 2: Write the failing test for `authedFetch`**

`src/shared/lib/staff-auth.server.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authedFetch, Unauthenticated, type TokenStore } from './staff-auth.server'

function fakeStore(initial: { access?: string; refresh?: string }): TokenStore & { saved: string[]; cleared: number } {
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
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('authedFetch', () => {
  it('attaches the Bearer access token', async () => {
    const store = fakeStore({ access: 'A1', refresh: 'R1' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ data: { ok: true } }))
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
    const retryHeaders = (fetchMock.mock.calls[2][1] as RequestInit).headers as Record<string, string>
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bunx vitest run src/shared/lib/staff-auth.server.test.ts`
Expected: FAIL — cannot import `./staff-auth.server` (module not found).

- [ ] **Step 4: Implement `staff-auth.server.ts`**

`src/shared/lib/staff-auth.server.ts`:
```ts
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { API_BASE_URL } from '@/shared/config'

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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bunx vitest run src/shared/lib/staff-auth.server.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/entities/staff/model.ts src/shared/lib/staff-auth.server.ts src/shared/lib/staff-auth.server.test.ts
git commit -m "feat(web): staff token store + authed fetch with refresh (E04)"
```

---

### Task 2: Auth server functions (login / session / logout)

**Files:**
- Create: `src/shared/api/auth.ts`
- Test: `src/shared/api/auth.test.ts`

**Interfaces:**
- Consumes: `cookieTokenStore`, `authedFetch`, `TokenStore` (Task 1); `StaffUser` (Task 1); `API_BASE_URL`.
- Produces: plain testable fns `doLogin(store, creds)`, `doGetSession(store)`, `doLogout(store)`; server fns `loginStaff`, `getStaffSession`, `logoutStaff`.

- [ ] **Step 1: Write the failing test**

`src/shared/api/auth.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { doLogin, doGetSession, doLogout } from './auth'
import type { TokenStore } from '@/shared/lib/staff-auth.server'

function fakeStore(initial: { access?: string; refresh?: string } = {}): TokenStore & { saved: string[]; cleared: number } {
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
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const user = { id: 'u1', email: 'kitchen@demo.test', name: 'Đầu Bếp', role: 'KITCHEN', restaurantId: 'r1' }

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
    await expect(doLogin(store, { email: 'x', password: 'y' })).rejects.toThrow('Email hoặc mật khẩu không đúng')
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
})

describe('doLogout', () => {
  it('revokes the refresh token and clears the store', async () => {
    const store = fakeStore({ access: 'A', refresh: 'R' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    await doLogout(store)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(store.cleared).toBe(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/shared/api/auth.test.ts`
Expected: FAIL — cannot import `./auth`.

- [ ] **Step 3: Implement `auth.ts`**

`src/shared/api/auth.ts`:
```ts
import { createServerFn } from '@tanstack/react-start'
import { API_BASE_URL } from '@/shared/config'
import { authedFetch, cookieTokenStore, type TokenStore } from '@/shared/lib/staff-auth.server'
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
  } catch {
    return null
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

export const logoutStaff = createServerFn({ method: 'POST' }).handler(
  (): Promise<void> => doLogout(cookieTokenStore),
)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/shared/api/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/auth.ts src/shared/api/auth.test.ts
git commit -m "feat(web): staff login/session/logout server functions (E04)"
```

---

### Task 3: Kitchen domain model + normalizers

**Files:**
- Create: `src/entities/kitchen/model.ts`
- Test: `src/entities/kitchen/model.test.ts`

**Interfaces:**
- Consumes: `toNumber` from `@/shared/lib/format`.
- Produces: types `KitchenStatus`, `KitchenOption`, `KitchenQueueItem`, `ServedItem`; fns `normalizeQueueItem(raw): KitchenQueueItem`, `normalizeServedItem(raw): ServedItem`.

- [ ] **Step 1: Write the failing test**

`src/entities/kitchen/model.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/entities/kitchen/model.test.ts`
Expected: FAIL — cannot import `./model`.

- [ ] **Step 3: Implement `model.ts`**

`src/entities/kitchen/model.ts`:
```ts
import { toNumber } from '@/shared/lib/format'

export type KitchenStatus = 'PENDING' | 'COOKING'

export interface KitchenOption {
  optionName: string
  priceDelta: number
}

export interface KitchenQueueItem {
  id: string
  tableName: string
  nameSnapshot: string
  quantity: number
  note: string | null
  status: KitchenStatus
  createdAt: string
  options: KitchenOption[]
}

export interface ServedItem {
  id: string
  tableName: string
  nameSnapshot: string
  quantity: number
  note: string | null
  servedAt: string
  options: KitchenOption[]
}

function mapOptions(raw: unknown): KitchenOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => {
    const opt = o as { optionName: unknown; priceDelta: unknown }
    return { optionName: String(opt.optionName), priceDelta: toNumber(opt.priceDelta) }
  })
}

export function normalizeQueueItem(raw: unknown): KitchenQueueItem {
  const r = raw as Record<string, unknown>
  return {
    id: String(r.id),
    tableName: String(r.tableName),
    nameSnapshot: String(r.nameSnapshot),
    quantity: toNumber(r.quantity),
    note: (r.note as string | null) ?? null,
    status: r.status as KitchenStatus,
    createdAt: String(r.createdAt),
    options: mapOptions(r.options),
  }
}

export function normalizeServedItem(raw: unknown): ServedItem {
  const r = raw as Record<string, unknown>
  return {
    id: String(r.id),
    tableName: String(r.tableName),
    nameSnapshot: String(r.nameSnapshot),
    quantity: toNumber(r.quantity),
    note: (r.note as string | null) ?? null,
    servedAt: String(r.servedAt),
    options: mapOptions(r.options),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/entities/kitchen/model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/kitchen/model.ts src/entities/kitchen/model.test.ts
git commit -m "feat(web): kitchen domain model + normalizers (E04)"
```

---

### Task 4: Kitchen server functions

**Files:**
- Create: `src/shared/api/kitchen.ts`
- Test: `src/shared/api/kitchen.test.ts`

**Interfaces:**
- Consumes: `authedFetch`, `cookieTokenStore`, `TokenStore` (Task 1); `normalizeQueueItem`, `normalizeServedItem`, `KitchenQueueItem`, `ServedItem` (Task 3); `toNumber`.
- Produces: types `KitchenMenuItem`; plain fns `fetchQueue(store)`, `fetchServed(store)`, `advanceItem(store, {id,status})`, `fetchMenuItems(store)`, `setAvailability(store, {id,isAvailable})`; server fns `fetchKitchenQueue`, `fetchServedRecent`, `advanceOrderItemStatus`, `listMenuItemsForKitchen`, `setMenuItemAvailability`.

- [ ] **Step 1: Write the failing test**

`src/shared/api/kitchen.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchQueue, fetchServed, advanceItem, setAvailability } from './kitchen'
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
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => vi.restoreAllMocks())

describe('fetchQueue', () => {
  it('normalizes the queue items', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        data: {
          items: [
            { id: 'oi1', tableName: 'Bàn 5', nameSnapshot: 'Phở', quantity: '2', note: null, status: 'PENDING', createdAt: 't', options: [] },
          ],
        },
      }),
    )
    const items = await fetchQueue(fakeStore())
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(2)
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
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ data: { item: { id: 'oi1', status: 'COOKING' } } }))
    await advanceItem(fakeStore(), { id: 'oi1', status: 'COOKING' })
    const init = fetchMock.mock.calls[0][1] as RequestInit
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
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ data: { item: { id: 'm1', isAvailable: false } } }))
    await setAvailability(fakeStore(), { id: 'm1', isAvailable: false })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({ isAvailable: false })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/shared/api/kitchen.test.ts`
Expected: FAIL — cannot import `./kitchen`.

- [ ] **Step 3: Implement `kitchen.ts`**

`src/shared/api/kitchen.ts`:
```ts
import { createServerFn } from '@tanstack/react-start'
import { authedFetch, cookieTokenStore, type TokenStore } from '@/shared/lib/staff-auth.server'
import { toNumber } from '@/shared/lib/format'
import {
  normalizeQueueItem,
  normalizeServedItem,
  type KitchenQueueItem,
  type ServedItem,
} from '@/entities/kitchen/model'

export interface KitchenMenuItem {
  id: string
  name: string
  isAvailable: boolean
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Backend error (${res.status})`)
  const json = (await res.json()) as { data: T }
  return json.data
}

export async function fetchQueue(store: TokenStore): Promise<KitchenQueueItem[]> {
  const data = await readJson<{ items: unknown[] }>(await authedFetch(store, '/api/kitchen/queue'))
  return data.items.map(normalizeQueueItem)
}

/** Served list is best-effort: a missing/erroring endpoint degrades to []. */
export async function fetchServed(store: TokenStore): Promise<ServedItem[]> {
  try {
    const res = await authedFetch(store, '/api/kitchen/served-recent')
    if (!res.ok) return []
    const json = (await res.json()) as { data: { items: unknown[] } }
    return json.data.items.map(normalizeServedItem)
  } catch {
    return []
  }
}

export async function advanceItem(
  store: TokenStore,
  input: { id: string; status: 'COOKING' | 'SERVED' },
): Promise<void> {
  const res = await authedFetch(store, `/api/kitchen/order-items/${encodeURIComponent(input.id)}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: input.status }),
  })
  if (!res.ok) throw new Error(`Không cập nhật được món (${res.status})`)
}

export async function fetchMenuItems(store: TokenStore): Promise<KitchenMenuItem[]> {
  const data = await readJson<{ menuItems: { id: unknown; name: unknown; isAvailable: unknown }[] }>(
    await authedFetch(store, '/api/menu-items/'),
  )
  return data.menuItems.map((m) => ({
    id: String(m.id),
    name: String(m.name),
    isAvailable: Boolean(m.isAvailable),
  }))
}

export async function setAvailability(
  store: TokenStore,
  input: { id: string; isAvailable: boolean },
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/kitchen/menu-items/${encodeURIComponent(input.id)}/availability`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isAvailable: input.isAvailable }),
    },
  )
  if (!res.ok) throw new Error(`Không cập nhật được trạng thái món (${res.status})`)
}

export const fetchKitchenQueue = createServerFn({ method: 'GET' }).handler(
  (): Promise<KitchenQueueItem[]> => fetchQueue(cookieTokenStore),
)

export const fetchServedRecent = createServerFn({ method: 'GET' }).handler(
  (): Promise<ServedItem[]> => fetchServed(cookieTokenStore),
)

export const advanceOrderItemStatus = createServerFn({ method: 'POST' })
  .validator((d: { id: string; status: 'COOKING' | 'SERVED' }) => d)
  .handler(({ data }): Promise<void> => advanceItem(cookieTokenStore, data))

export const listMenuItemsForKitchen = createServerFn({ method: 'GET' }).handler(
  (): Promise<KitchenMenuItem[]> => fetchMenuItems(cookieTokenStore),
)

export const setMenuItemAvailability = createServerFn({ method: 'POST' })
  .validator((d: { id: string; isAvailable: boolean }) => d)
  .handler(({ data }): Promise<void> => setAvailability(cookieTokenStore, data))
```
(`toNumber` import is retained for parity with sibling api modules and future money fields; if your linter flags it as unused, drop the import.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/shared/api/kitchen.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/kitchen.ts src/shared/api/kitchen.test.ts
git commit -m "feat(web): kitchen server functions (queue/served/advance/availability) (E04)"
```

---

### Task 5: `useKitchenStream` hook

**Files:**
- Create: `src/entities/kitchen/useKitchenStream.ts`
- Test: `src/entities/kitchen/useKitchenStream.test.ts`

**Interfaces:**
- Consumes: `fetchKitchenQueue`, `fetchServedRecent` (Task 4); `KitchenQueueItem`, `ServedItem` (Task 3).
- Produces: `useKitchenStream(restaurantId): { queue: KitchenQueueItem[]; served: ServedItem[]; mode: 'live'|'polling'|'error'; refetch: () => void }`.

This mirrors `src/entities/order/useOrderStream.ts`. The staff stream's verified event is `order_item.updated`.

- [ ] **Step 1: Write the failing test**

`src/entities/kitchen/useKitchenStream.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/shared/api/kitchen', () => ({
  fetchKitchenQueue: vi.fn(() =>
    Promise.resolve([
      { id: 'oi1', tableName: 'Bàn 5', nameSnapshot: 'Phở', quantity: 1, note: null, status: 'PENDING', createdAt: 't', options: [] },
    ]),
  ),
  fetchServedRecent: vi.fn(() => Promise.resolve([])),
}))

import { fetchKitchenQueue } from '@/shared/api/kitchen'
import { useKitchenStream } from './useKitchenStream'

// Minimal EventSource stub so the hook can construct one in happy-dom.
class FakeEventSource {
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  listeners: Record<string, () => void> = {}
  constructor(public url: string) {}
  addEventListener(type: string, cb: () => void) {
    this.listeners[type] = cb
  }
  close() {}
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource
})
afterEach(() => vi.restoreAllMocks())

describe('useKitchenStream', () => {
  it('loads the queue on mount', async () => {
    const { result } = renderHook(() => useKitchenStream('r1'))
    await waitFor(() => expect(result.current.queue).toHaveLength(1))
    expect(fetchKitchenQueue).toHaveBeenCalled()
    expect(result.current.queue[0].nameSnapshot).toBe('Phở')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/entities/kitchen/useKitchenStream.test.ts`
Expected: FAIL — cannot import `./useKitchenStream`.

- [ ] **Step 3: Implement `useKitchenStream.ts`**

`src/entities/kitchen/useKitchenStream.ts`:
```ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchKitchenQueue, fetchServedRecent } from '@/shared/api/kitchen'
import type { KitchenQueueItem, ServedItem } from './model'

export type StreamMode = 'live' | 'polling' | 'error'

const POLL_MS = 2500
const RECONNECT_MS = 5000

export function useKitchenStream(restaurantId: string): {
  queue: KitchenQueueItem[]
  served: ServedItem[]
  mode: StreamMode
  refetch: () => void
} {
  const [queue, setQueue] = useState<KitchenQueueItem[]>([])
  const [served, setServed] = useState<ServedItem[]>([])
  const [mode, setMode] = useState<StreamMode>('polling')
  const loadedRef = useRef(false)
  const disposedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const [q, s] = await Promise.all([fetchKitchenQueue(), fetchServedRecent()])
      if (disposedRef.current) return
      loadedRef.current = true
      setQueue(q)
      setServed(s)
    } catch {
      if (disposedRef.current) return
      if (!loadedRef.current) setMode('error')
    }
  }, [])

  useEffect(() => {
    disposedRef.current = false
    let stream: EventSource | null = null
    let pollTimer: ReturnType<typeof setInterval> | undefined
    let reconnectTimer: ReturnType<typeof setInterval> | undefined
    let disposed = false

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer)
      if (reconnectTimer) clearInterval(reconnectTimer)
      pollTimer = undefined
      reconnectTimer = undefined
    }

    const startPolling = () => {
      if (pollTimer || disposed) return
      setMode('polling')
      pollTimer = setInterval(() => void load(), POLL_MS)
      reconnectTimer = setInterval(connect, RECONNECT_MS)
    }

    function connect() {
      if (disposed) return
      stream?.close()
      const es = new EventSource(`/api/stream/restaurant/${encodeURIComponent(restaurantId)}`)
      stream = es
      es.onopen = () => {
        stopPolling()
        setMode('live')
      }
      es.addEventListener('order_item.updated', () => void load())
      es.onerror = () => {
        es.close()
        if (stream === es) stream = null
        startPolling()
      }
    }

    void load()
    connect()

    return () => {
      disposed = true
      disposedRef.current = true
      stopPolling()
      stream?.close()
    }
  }, [restaurantId, load])

  return {
    queue,
    served,
    mode,
    refetch: () => {
      void load()
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/entities/kitchen/useKitchenStream.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/kitchen/useKitchenStream.ts src/entities/kitchen/useKitchenStream.test.ts
git commit -m "feat(web): useKitchenStream SSE hook with polling fallback (E04)"
```

---

### Task 6: SSE proxy route for the staff stream

**Files:**
- Create: `src/routes/api/stream.restaurant.$id.ts`

**Interfaces:**
- Consumes: `cookieTokenStore` (Task 1); `API_BASE_URL`.
- Produces: server route `GET /api/stream/restaurant/$id` that injects the Bearer token and pipes the BE event stream. Matches the URL `useKitchenStream` connects to.

No unit test (mirrors the existing untested `api/qr.$qrToken.stream.ts`); verified manually in Task 10.

- [ ] **Step 1: Implement the proxy route**

`src/routes/api/stream.restaurant.$id.ts`:
```ts
import { createFileRoute } from '@tanstack/react-router'
import { API_BASE_URL } from '@/shared/config'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'

export const Route = createFileRoute('/api/stream/restaurant/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = cookieTokenStore.getAccess()
        if (!token) return new Response('unauthorized', { status: 401 })
        let upstream: Response
        try {
          upstream = await fetch(
            `${API_BASE_URL}/api/stream/restaurant/${encodeURIComponent(params.id)}`,
            { headers: { accept: 'text/event-stream', authorization: `Bearer ${token}` } },
          )
        } catch {
          return new Response('stream unavailable', { status: 502 })
        }
        if (!upstream.ok || !upstream.body) {
          return new Response('stream unavailable', { status: upstream.status || 502 })
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            'x-accel-buffering': 'no',
          },
        })
      },
    },
  },
})
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/stream.restaurant.\$id.ts
git commit -m "feat(web): staff SSE proxy route with Bearer injection (E04)"
```

---

### Task 7: `KitchenCard` widget

**Files:**
- Create: `src/widgets/kitchen-board/KitchenCard.tsx`
- Test: `src/widgets/kitchen-board/KitchenCard.test.tsx`

**Interfaces:**
- Consumes: `KitchenQueueItem`, `ServedItem` (Task 3); `Button`, `Badge` from `@/shared/ui`; `formatVND` from `@/shared/lib/format`.
- Produces: `KitchenCard({ item, onAdvance })` where `item` is a queue item (renders `Bắt đầu`/`Xong →`) or `{ kind: 'served', item }` (read-only). Signature below.

- [ ] **Step 1: Write the failing test**

`src/widgets/kitchen-board/KitchenCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KitchenCard } from './KitchenCard'
import type { KitchenQueueItem } from '@/entities/kitchen/model'

const pending: KitchenQueueItem = {
  id: 'oi1',
  tableName: 'Bàn 5',
  nameSnapshot: 'Phở bò',
  quantity: 2,
  note: 'ít hành',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  options: [{ optionName: 'Thêm trứng', priceDelta: 5000 }],
}

describe('KitchenCard', () => {
  it('shows table, qty, name, note and options for a pending item', () => {
    render(<KitchenCard item={pending} onAdvance={vi.fn()} />)
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
    expect(screen.getByText(/Phở bò/)).toBeInTheDocument()
    expect(screen.getByText(/× 2/)).toBeInTheDocument()
    expect(screen.getByText(/ít hành/)).toBeInTheDocument()
    expect(screen.getByText(/Thêm trứng/)).toBeInTheDocument()
  })

  it('a pending card calls onAdvance with COOKING via "Bắt đầu"', () => {
    const onAdvance = vi.fn()
    render(<KitchenCard item={pending} onAdvance={onAdvance} />)
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    expect(onAdvance).toHaveBeenCalledWith('oi1', 'COOKING')
  })

  it('a cooking card calls onAdvance with SERVED via "Xong"', () => {
    const onAdvance = vi.fn()
    render(<KitchenCard item={{ ...pending, status: 'COOKING' }} onAdvance={onAdvance} />)
    fireEvent.click(screen.getByRole('button', { name: /Xong/ }))
    expect(onAdvance).toHaveBeenCalledWith('oi1', 'SERVED')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/widgets/kitchen-board/KitchenCard.test.tsx`
Expected: FAIL — cannot import `./KitchenCard`.

- [ ] **Step 3: Implement `KitchenCard.tsx`**

`src/widgets/kitchen-board/KitchenCard.tsx`:
```tsx
import { Button } from '@/shared/ui'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen/model'

interface QueueProps {
  item: KitchenQueueItem
  onAdvance: (id: string, status: 'COOKING' | 'SERVED') => void
}

interface ServedProps {
  item: ServedItem
  served: true
}

type Props = QueueProps | ServedProps

/** Minutes elapsed since an ISO timestamp, clamped to >= 0. */
function minutesSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / 60000))
}

function elapsedClass(minutes: number): string {
  if (minutes >= 15) return 'text-red-600'
  if (minutes >= 8) return 'text-orange-600'
  return 'text-muted'
}

export function KitchenCard(props: Props) {
  const { item } = props
  const isServed = 'served' in props
  const timestamp = isServed ? (item as ServedItem).servedAt : (item as KitchenQueueItem).createdAt
  const minutes = minutesSince(timestamp)

  return (
    <article className="rounded-control border border-line-strong bg-white p-3">
      <header className="flex items-center justify-between">
        <span className="font-bold text-ink">{item.tableName}</span>
        <span className={elapsedClass(minutes)}>{minutes}′</span>
      </header>
      <p className="mt-1 text-sm text-ink">
        {item.nameSnapshot} <span className="font-semibold">× {item.quantity}</span>
      </p>
      {item.options.length > 0 && (
        <p className="text-xs text-secondary">{item.options.map((o) => `+${o.optionName}`).join(', ')}</p>
      )}
      {item.note && <p className="text-xs italic text-secondary">“{item.note}”</p>}
      {!isServed && (
        <div className="mt-2">
          {(item as KitchenQueueItem).status === 'PENDING' ? (
            <Button size="sm" fullWidth onClick={() => (props as QueueProps).onAdvance(item.id, 'COOKING')}>
              Bắt đầu
            </Button>
          ) : (
            <Button size="sm" fullWidth onClick={() => (props as QueueProps).onAdvance(item.id, 'SERVED')}>
              Xong →
            </Button>
          )}
        </div>
      )}
      {isServed && <p className="mt-2 text-xs font-semibold text-green-700">✓ Đã phục vụ</p>}
    </article>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/widgets/kitchen-board/KitchenCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/kitchen-board/KitchenCard.tsx src/widgets/kitchen-board/KitchenCard.test.tsx
git commit -m "feat(web): KitchenCard widget (E04)"
```

---

### Task 8: `KitchenBoard` widget (3 columns)

**Files:**
- Create: `src/widgets/kitchen-board/KitchenBoard.tsx`
- Test: `src/widgets/kitchen-board/KitchenBoard.test.tsx`

**Interfaces:**
- Consumes: `KitchenCard` (Task 7); `KitchenQueueItem`, `ServedItem` (Task 3).
- Produces: `KitchenBoard({ queue, served, onAdvance })`. Splits `queue` into PENDING/COOKING internally.

- [ ] **Step 1: Write the failing test**

`src/widgets/kitchen-board/KitchenBoard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KitchenBoard } from './KitchenBoard'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen/model'

const base = { tableName: 'Bàn 1', nameSnapshot: 'Phở', quantity: 1, note: null, options: [], createdAt: 't' }
const queue: KitchenQueueItem[] = [
  { ...base, id: 'p1', status: 'PENDING' },
  { ...base, id: 'p2', status: 'PENDING' },
  { ...base, id: 'c1', status: 'COOKING' },
]
const served: ServedItem[] = [{ id: 's1', tableName: 'Bàn 4', nameSnapshot: 'Gỏi', quantity: 1, note: null, options: [], servedAt: new Date().toISOString() }]

describe('KitchenBoard', () => {
  it('renders the three columns with counts', () => {
    render(<KitchenBoard queue={queue} served={served} onAdvance={vi.fn()} />)
    expect(screen.getByText(/Chờ làm \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Đang làm \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Đã xong/)).toBeInTheDocument()
  })

  it('shows an empty state for an empty pending column', () => {
    render(<KitchenBoard queue={[]} served={[]} onAdvance={vi.fn()} />)
    expect(screen.getAllByText(/Chưa có món/).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/widgets/kitchen-board/KitchenBoard.test.tsx`
Expected: FAIL — cannot import `./KitchenBoard`.

- [ ] **Step 3: Implement `KitchenBoard.tsx`**

`src/widgets/kitchen-board/KitchenBoard.tsx`:
```tsx
import { KitchenCard } from './KitchenCard'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen/model'

interface Props {
  queue: KitchenQueueItem[]
  served: ServedItem[]
  onAdvance: (id: string, status: 'COOKING' | 'SERVED') => void
}

function Column({ title, count, empty, children }: { title: string; count?: number; empty: boolean; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2">
      <h2 className="text-sm font-bold text-ink">
        {title}
        {count != null && ` (${count})`}
      </h2>
      {empty ? <p className="text-xs text-muted">Chưa có món</p> : children}
    </section>
  )
}

export function KitchenBoard({ queue, served, onAdvance }: Props) {
  const pending = queue.filter((i) => i.status === 'PENDING')
  const cooking = queue.filter((i) => i.status === 'COOKING')

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-3">
      <Column title="Chờ làm" count={pending.length} empty={pending.length === 0}>
        {pending.map((item) => (
          <KitchenCard key={item.id} item={item} onAdvance={onAdvance} />
        ))}
      </Column>
      <Column title="Đang làm" count={cooking.length} empty={cooking.length === 0}>
        {cooking.map((item) => (
          <KitchenCard key={item.id} item={item} onAdvance={onAdvance} />
        ))}
      </Column>
      <Column title="Đã xong" empty={served.length === 0}>
        {served.map((item) => (
          <KitchenCard key={item.id} item={item} served />
        ))}
      </Column>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/widgets/kitchen-board/KitchenBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/kitchen-board/KitchenBoard.tsx src/widgets/kitchen-board/KitchenBoard.test.tsx
git commit -m "feat(web): KitchenBoard 3-column layout (E04)"
```

---

### Task 9: `SoldOutPanel` widget

**Files:**
- Create: `src/widgets/sold-out-panel/SoldOutPanel.tsx`
- Test: `src/widgets/sold-out-panel/SoldOutPanel.test.tsx`

**Interfaces:**
- Consumes: `KitchenMenuItem` (Task 4); `Drawer*` from `@/shared/ui`; `Button`.
- Produces: `SoldOutPanel({ open, onOpenChange, items, onToggle })` — `onToggle(id, nextIsAvailable)`.

- [ ] **Step 1: Write the failing test**

`src/widgets/sold-out-panel/SoldOutPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SoldOutPanel } from './SoldOutPanel'
import type { KitchenMenuItem } from '@/shared/api/kitchen'

const items: KitchenMenuItem[] = [
  { id: 'm1', name: 'Phở bò', isAvailable: true },
  { id: 'm2', name: 'Bún chả', isAvailable: false },
]

describe('SoldOutPanel', () => {
  it('lists items and toggles availability', async () => {
    const onToggle = vi.fn()
    render(<SoldOutPanel open onOpenChange={vi.fn()} items={items} onToggle={onToggle} />)
    // "Phở bò" is available -> action marks it sold out (next = false)
    fireEvent.click(await screen.findByRole('button', { name: /Tạm hết.*Phở bò|Phở bò.*Tạm hết/ }))
    expect(onToggle).toHaveBeenCalledWith('m1', false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/widgets/sold-out-panel/SoldOutPanel.test.tsx`
Expected: FAIL — cannot import `./SoldOutPanel`.

- [ ] **Step 3: Implement `SoldOutPanel.tsx`**

`src/widgets/sold-out-panel/SoldOutPanel.tsx`:
```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/shared/ui'
import { Button } from '@/shared/ui'
import type { KitchenMenuItem } from '@/shared/api/kitchen'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: KitchenMenuItem[]
  onToggle: (id: string, nextIsAvailable: boolean) => void
}

export function SoldOutPanel({ open, onOpenChange, items, onToggle }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Hết món</DrawerTitle>
        </DrawerHeader>
        <ul className="flex flex-col gap-2 px-4 pb-6">
          {items.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3">
              <span className={m.isAvailable ? 'text-ink' : 'text-muted line-through'}>{m.name}</span>
              <Button
                size="sm"
                variant={m.isAvailable ? 'secondary' : 'primary'}
                aria-label={m.isAvailable ? `Tạm hết ${m.name}` : `Mở lại ${m.name}`}
                onClick={() => onToggle(m.id, !m.isAvailable)}
              >
                {m.isAvailable ? 'Tạm hết' : 'Mở lại'}
              </Button>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/widgets/sold-out-panel/SoldOutPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/sold-out-panel/SoldOutPanel.tsx src/widgets/sold-out-panel/SoldOutPanel.test.tsx
git commit -m "feat(web): SoldOutPanel for US-4.3 (E04)"
```

---

### Task 10: `StaffLoginPage`

**Files:**
- Create: `src/pages/staff-login/StaffLoginPage.tsx`
- Test: `src/pages/staff-login/StaffLoginPage.test.tsx`

**Interfaces:**
- Consumes: `Input`, `Button` from `@/shared/ui`.
- Produces: `StaffLoginPage({ onSubmit })` where `onSubmit(email, password): Promise<void>`; shows the rejection message.

- [ ] **Step 1: Write the failing test**

`src/pages/staff-login/StaffLoginPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StaffLoginPage } from './StaffLoginPage'

describe('StaffLoginPage', () => {
  it('submits the entered credentials', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    render(<StaffLoginPage onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText(/Email/), { target: { value: 'kitchen@demo.test' } })
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/), { target: { value: 'kitchen-password' } })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/ }))
    expect(onSubmit).toHaveBeenCalledWith('kitchen@demo.test', 'kitchen-password')
  })

  it('shows the error message when login rejects', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error('Email hoặc mật khẩu không đúng')))
    render(<StaffLoginPage onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText(/Email/), { target: { value: 'x' } })
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu/), { target: { value: 'y' } })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/ }))
    expect(await screen.findByText('Email hoặc mật khẩu không đúng')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/pages/staff-login/StaffLoginPage.test.tsx`
Expected: FAIL — cannot import `./StaffLoginPage`.

- [ ] **Step 3: Implement `StaffLoginPage.tsx`**

`src/pages/staff-login/StaffLoginPage.tsx`:
```tsx
import { useState } from 'react'
import { Input, Button } from '@/shared/ui'

interface Props {
  onSubmit: (email: string, password: string) => Promise<void>
}

export function StaffLoginPage({ onSubmit }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-bold text-ink">Đăng nhập nhân viên</h1>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <Input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/pages/staff-login/StaffLoginPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/staff-login/StaffLoginPage.tsx src/pages/staff-login/StaffLoginPage.test.tsx
git commit -m "feat(web): StaffLoginPage (E04)"
```

---

### Task 11: `KitchenScreenPage` (compose + orchestrate)

**Files:**
- Create: `src/pages/kitchen-screen/KitchenScreenPage.tsx`
- Test: `src/pages/kitchen-screen/KitchenScreenPage.test.tsx`

**Interfaces:**
- Consumes: `useKitchenStream` (Task 5); `KitchenBoard` (Task 8); `SoldOutPanel` (Task 9); `advanceOrderItemStatus`, `listMenuItemsForKitchen`, `setMenuItemAvailability`, `KitchenMenuItem` (Task 4); `StaffUser` (Task 1); `Button`, `Badge`.
- Produces: `KitchenScreenPage({ user, onLogout })`.

Orchestration rules:
- Optimistic advance: on `onAdvance(id, status)`, immediately move the item locally, call `advanceOrderItemStatus`; on failure, refetch to roll back and surface a toast.
- Sold-out: open the panel → lazy-load menu items via `listMenuItemsForKitchen`; toggle optimistically, call `setMenuItemAvailability`, refetch list on failure.

- [ ] **Step 1: Write the failing test**

`src/pages/kitchen-screen/KitchenScreenPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/entities/kitchen/useKitchenStream', () => ({
  useKitchenStream: vi.fn(() => ({
    queue: [
      { id: 'p1', tableName: 'Bàn 5', nameSnapshot: 'Phở', quantity: 1, note: null, status: 'PENDING', createdAt: new Date().toISOString(), options: [] },
    ],
    served: [],
    mode: 'live',
    refetch: vi.fn(),
  })),
}))
vi.mock('@/shared/api/kitchen', () => ({
  advanceOrderItemStatus: vi.fn(() => Promise.resolve()),
  listMenuItemsForKitchen: vi.fn(() => Promise.resolve([{ id: 'm1', name: 'Phở bò', isAvailable: true }])),
  setMenuItemAvailability: vi.fn(() => Promise.resolve()),
}))

import { KitchenScreenPage } from './KitchenScreenPage'
import { advanceOrderItemStatus, listMenuItemsForKitchen } from '@/shared/api/kitchen'

const user = { id: 'u1', email: 'kitchen@demo.test', name: 'Đầu Bếp', role: 'KITCHEN' as const, restaurantId: 'r1' }

beforeEach(() => vi.clearAllMocks())

describe('KitchenScreenPage', () => {
  it('renders the header and queue', () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    expect(screen.getByText('Màn hình bếp')).toBeInTheDocument()
    expect(screen.getByText(/Chờ làm \(1\)/)).toBeInTheDocument()
  })

  it('advancing a pending item calls advanceOrderItemStatus', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    await waitFor(() =>
      expect(advanceOrderItemStatus).toHaveBeenCalledWith({ data: { id: 'p1', status: 'COOKING' } }),
    )
  })

  it('opening the sold-out panel loads menu items', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Hết món/ }))
    await waitFor(() => expect(listMenuItemsForKitchen).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bunx vitest run src/pages/kitchen-screen/KitchenScreenPage.test.tsx`
Expected: FAIL — cannot import `./KitchenScreenPage`.

- [ ] **Step 3: Implement `KitchenScreenPage.tsx`**

`src/pages/kitchen-screen/KitchenScreenPage.tsx`:
```tsx
import { useCallback, useState } from 'react'
import { Badge, Button } from '@/shared/ui'
import { KitchenBoard } from '@/widgets/kitchen-board/KitchenBoard'
import { SoldOutPanel } from '@/widgets/sold-out-panel/SoldOutPanel'
import { useKitchenStream } from '@/entities/kitchen/useKitchenStream'
import {
  advanceOrderItemStatus,
  listMenuItemsForKitchen,
  setMenuItemAvailability,
  type KitchenMenuItem,
} from '@/shared/api/kitchen'
import type { StaffUser } from '@/entities/staff/model'

interface Props {
  user: StaffUser
  onLogout: () => void
}

export function KitchenScreenPage({ user, onLogout }: Props) {
  const { queue, served, mode, refetch } = useKitchenStream(user.restaurantId)
  const [toast, setToast] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<KitchenMenuItem[]>([])

  const onAdvance = useCallback(
    async (id: string, status: 'COOKING' | 'SERVED') => {
      setToast(null)
      try {
        await advanceOrderItemStatus({ data: { id, status } })
        refetch()
      } catch {
        setToast('Không cập nhật được món, thử lại.')
        refetch()
      }
    },
    [refetch],
  )

  const openPanel = useCallback(async () => {
    setPanelOpen(true)
    try {
      setMenuItems(await listMenuItemsForKitchen())
    } catch {
      setToast('Không tải được danh sách món.')
    }
  }, [])

  const onToggleAvailability = useCallback(async (id: string, nextIsAvailable: boolean) => {
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, isAvailable: nextIsAvailable } : m)))
    try {
      await setMenuItemAvailability({ data: { id, isAvailable: nextIsAvailable } })
    } catch {
      setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, isAvailable: !nextIsAvailable } : m)))
      setToast('Không cập nhật được trạng thái món.')
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-ink">Màn hình bếp</h1>
        <div className="flex items-center gap-2">
          <Badge variant={mode === 'live' ? 'brand' : 'outline'} dot>
            {mode === 'live' ? 'Trực tiếp' : 'Đang dò'}
          </Badge>
          <Button size="sm" variant="secondary" onClick={openPanel}>
            Hết món
          </Button>
          <Button size="sm" variant="ghost" onClick={onLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>

      {toast && <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{toast}</p>}

      <KitchenBoard queue={queue} served={served} onAdvance={onAdvance} />

      <SoldOutPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        items={menuItems}
        onToggle={onToggleAvailability}
      />
    </main>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bunx vitest run src/pages/kitchen-screen/KitchenScreenPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/kitchen-screen/KitchenScreenPage.tsx src/pages/kitchen-screen/KitchenScreenPage.test.tsx
git commit -m "feat(web): KitchenScreenPage compose + optimistic actions (E04)"
```

---

### Task 12: Routes wiring (guard + login + index)

**Files:**
- Create: `src/routes/kitchen.tsx`
- Create: `src/routes/kitchen.index.tsx`
- Create: `src/routes/kitchen.login.tsx`

**Interfaces:**
- Consumes: `getStaffSession`, `loginStaff`, `logoutStaff` (Task 2); `KitchenScreenPage` (Task 11); `StaffLoginPage` (Task 10); `StaffUser` (Task 1).
- Produces: routes `/kitchen` (guarded layout), `/kitchen/` (board), `/kitchen/login`.

Wiring only (mirrors the untested `t.$qrToken.tsx` route family); verified in Task 13 + manual check. The guard allows roles `KITCHEN` and `ADMIN`.

- [ ] **Step 1: Implement the guarded layout**

`src/routes/kitchen.tsx`:
```tsx
import { createFileRoute, redirect, Outlet, useRouter } from '@tanstack/react-router'
import { getStaffSession, logoutStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen')({
  beforeLoad: async ({ location }) => {
    // The login route is public; everything else under /kitchen requires a session.
    if (location.pathname.startsWith('/kitchen/login')) return {}
    const session = await getStaffSession()
    if (!session || (session.role !== 'KITCHEN' && session.role !== 'ADMIN')) {
      throw redirect({ to: '/kitchen/login' })
    }
    return { session }
  },
  component: KitchenLayout,
})

function KitchenLayout() {
  return <Outlet />
}

export { logoutStaff, useRouter }
```
(The `logoutStaff`/`useRouter` re-export keeps imports local to children that need them; if your linter dislikes re-exports, import them directly in `kitchen.index.tsx` instead.)

- [ ] **Step 2: Implement the index (board) route**

`src/routes/kitchen.index.tsx`:
```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KitchenScreenPage } from '@/pages/kitchen-screen/KitchenScreenPage'
import { getStaffSession, logoutStaff } from '@/shared/api/auth'
import type { StaffUser } from '@/entities/staff/model'

export const Route = createFileRoute('/kitchen/')({
  loader: async (): Promise<{ user: StaffUser }> => {
    const session = await getStaffSession()
    // The parent guard already redirected unauthenticated users; assert for types.
    if (!session) throw new Error('No session')
    return { user: session }
  },
  component: KitchenIndex,
})

function KitchenIndex() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <KitchenScreenPage
      user={user}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
```

- [ ] **Step 3: Implement the login route**

`src/routes/kitchen.login.tsx`:
```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { StaffLoginPage } from '@/pages/staff-login/StaffLoginPage'
import { loginStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/kitchen/login')({
  component: KitchenLogin,
})

function KitchenLogin() {
  const navigate = useNavigate()
  return (
    <StaffLoginPage
      onSubmit={async (email, password) => {
        await loginStaff({ data: { email, password } })
        await navigate({ to: '/kitchen' })
      }}
    />
  )
}
```

- [ ] **Step 4: Type-check + full unit suite**

Run: `npm run typecheck && npm test`
Expected: PASS (all unit/component tests green; no type errors). If the router complains about generated route types, run `npm run dev` once to regenerate `routeTree.gen.ts`, then re-run.

- [ ] **Step 5: Commit**

```bash
git add src/routes/kitchen.tsx src/routes/kitchen.index.tsx src/routes/kitchen.login.tsx src/routeTree.gen.ts
git commit -m "feat(web): /kitchen guarded routes + login + board wiring (E04)"
```

---

### Task 13: End-to-end test + manual verification

**Files:**
- Create: `e2e/kitchen.spec.ts`

**Interfaces:**
- Consumes: the running FE (`vite dev --port 3001`) + seeded BE on `API_BASE_URL`.

- [ ] **Step 1: Write the e2e test**

`e2e/kitchen.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

const email = process.env.E2E_KITCHEN_EMAIL
const password = process.env.E2E_KITCHEN_PASSWORD

test.describe('Kitchen screen', () => {
  test('logs in and shows the kitchen board', async ({ page }) => {
    test.skip(!email || !password, 'Set E2E_KITCHEN_EMAIL/E2E_KITCHEN_PASSWORD (seeded kitchen@demo.test / kitchen-password)')
    await page.goto('/kitchen/login')
    await page.getByPlaceholder(/Email/).fill(email!)
    await page.getByPlaceholder(/Mật khẩu/).fill(password!)
    await page.getByRole('button', { name: /Đăng nhập/ }).click()
    await expect(page.getByText('Màn hình bếp')).toBeVisible()
    await expect(page.getByText(/Chờ làm/)).toBeVisible()
  })

  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/kitchen')
    await expect(page).toHaveURL(/\/kitchen\/login/)
    await expect(page.getByRole('button', { name: /Đăng nhập/ })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the redirect test (no env needed)**

Start the FE (`npm run dev`) with the seeded BE running, then:
Run: `npm run test:e2e -- kitchen.spec.ts -g "redirects to login"`
Expected: PASS — `/kitchen` bounces to `/kitchen/login`.

- [ ] **Step 3: Run the happy path against the seeded BE**

In the BE repo: `bun run db:seed`. Then:
Run: `E2E_KITCHEN_EMAIL=kitchen@demo.test E2E_KITCHEN_PASSWORD=kitchen-password npm run test:e2e -- kitchen.spec.ts`
Expected: PASS — login lands on the board showing `Màn hình bếp` and `Chờ làm`.

- [ ] **Step 4: Manual verification of realtime + actions**

With FE + seeded BE running and logged in as kitchen:
1. From a customer QR session (`/t/qr-table-01`) submit an order → it appears in `Chờ làm` without reload (SSE live; the connection badge reads `Trực tiếp`).
2. Click `Bắt đầu` → item moves to `Đang làm`. Click `Xong →` → item moves to `Đã xong` (served-recent).
3. Open `Hết món`, mark a dish `Tạm hết` → confirm it disappears from the customer menu.
4. Kill the BE briefly → the badge flips to `Đang dò` (polling) and recovers when the BE returns.

- [ ] **Step 5: Commit**

```bash
git add e2e/kitchen.spec.ts
git commit -m "test(web): e2e kitchen login + guard (E04)"
```

---

## Self-Review

**Spec coverage:**
- US-4.1 (realtime queue, table/qty/note/options, oldest-first) → Tasks 3, 5, 7, 8, 11 (BE queue is already oldest-first; board renders PENDING/COOKING).
- US-4.2 (advance PENDING→COOKING→SERVED, realtime push) → Tasks 4, 7, 11 (+ SSE in Task 5/6).
- US-4.3 (sold-out hides from customer menu) → Tasks 4, 9, 11.
- Thin auth (login, cookie, refresh, logout, role guard) → Tasks 1, 2, 12.
- `Đã xong` durable via BE endpoint, with degradation → Tasks 4 (`fetchServed` returns [] on error), 5, 8, 11.
- SSE proxy with Bearer → Task 6; staff event name `order_item.updated` → Task 5.
- Tests (unit/component/e2e) → every task + Task 13.

**Placeholder scan:** No TBD/TODO; every code step contains complete code; commands have expected output.

**Type consistency:** `TokenStore` shape identical across Tasks 1/2/4; `authedFetch(store, path, init)` used consistently; `onAdvance(id, status)` signature matches between `KitchenCard` (Task 7), `KitchenBoard` (Task 8), and `KitchenScreenPage` (Task 11); server fns invoked as `fn({ data })` matching the existing `submitOrderItems` convention; `KitchenMenuItem` defined in Task 4 and consumed in Tasks 9/11.

**Note for executor:** TanStack route file naming — `kitchen.tsx` is the layout, `kitchen.index.tsx` the index, `kitchen.login.tsx` the child; the SSE proxy file is `src/routes/api/stream.restaurant.$id.ts` resolving to `/api/stream/restaurant/$id`. After adding route files, the dev server regenerates `src/routeTree.gen.ts` — commit it with Task 12.
