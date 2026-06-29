# Customer Order Tracking + Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the QR customer a dedicated `/t/:token/order` page that shows their order's per-item status live (PENDING → COOKING → SERVED / CANCELLED), backed by SSE with a polling fallback.

**Architecture:** A client-side hook (`useOrderStream`) loads the order via an existing-style server function (`getOrder`) and subscribes to a TanStack Start SSE proxy route (`/api/qr/$qrToken/stream`) that streams-through the Elysia backend. On any `order_item.updated` event it refetches the whole order; if SSE errors it falls back to polling every 2.5s and periodically retries the stream. A new `customer-order` page composes the hook with an `order-tracker` widget.

**Tech Stack:** TanStack Start + Router (latest), React 19, TypeScript, Tailwind, Phosphor icons, Vitest + Testing Library (happy-dom), Playwright.

## Global Constraints

- Package manager is **Bun**; dev server runs on **:3001**, backend on **:3000** (server functions proxy via `API_BASE_URL`, default `http://localhost:3000`). The browser never calls :3000 directly — go through a server function or a Start server route.
- Money fields from the BE are integers in đồng but may be serialized as integer-strings; always pass them through `toNumber` from `@/shared/lib/format` and display with `formatVND`.
- UI copy is Vietnamese. Follow the existing shadcn-style ui kit (`@/shared/ui`), `cn` from `@/shared/lib/cn`, and the design tokens already in use (`ink`, `muted`, `line`, `line-strong`, `brand`, `page`, `ok-bg`, `ok-text`).
- Tests: unit specs live next to source as `*.test.tsx`; run with `bun run test`. E2E in `e2e/*.spec.ts`; happy paths gate on `process.env.E2E_QR_TOKEN`.
- Commit frequently (one commit per task). Merge style for PRs is a normal merge commit, never squash.

---

### Task 1: Order entity — types, status metadata, normalizer

**Files:**
- Create: `src/entities/order/model.ts`
- Create: `src/entities/order/status.ts`
- Create: `src/entities/order/normalize.ts`
- Test: `src/entities/order/normalize.test.ts`
- Test: `src/entities/order/status.test.ts`

**Interfaces:**
- Consumes: `toNumber` from `@/shared/lib/format`.
- Produces:
  - Types `OrderItemStatus = 'PENDING' | 'COOKING' | 'SERVED' | 'CANCELLED'`, `OrderStatus = 'OPEN' | 'PAID' | 'CANCELLED'`, `OrderItemOption`, `OrderItem`, `Order` (shapes below).
  - `ORDER_ITEM_STATUS_META: Record<OrderItemStatus, { label: string; tone: 'pending' | 'cooking' | 'served' | 'cancelled' }>`
  - `ORDER_ITEM_PROGRESS: OrderItemStatus[]` = `['PENDING', 'COOKING', 'SERVED']`
  - `normalizeOrder(raw: unknown): Order`

- [ ] **Step 1: Write the failing tests**

```ts
// src/entities/order/status.test.ts
import { describe, it, expect } from 'vitest'
import { ORDER_ITEM_STATUS_META, ORDER_ITEM_PROGRESS } from './status'

describe('order item status metadata', () => {
  it('has a Vietnamese label and tone for every status', () => {
    expect(ORDER_ITEM_STATUS_META.PENDING).toEqual({ label: 'Chờ xác nhận', tone: 'pending' })
    expect(ORDER_ITEM_STATUS_META.COOKING).toEqual({ label: 'Đang nấu', tone: 'cooking' })
    expect(ORDER_ITEM_STATUS_META.SERVED).toEqual({ label: 'Đã phục vụ', tone: 'served' })
    expect(ORDER_ITEM_STATUS_META.CANCELLED).toEqual({ label: 'Đã hủy', tone: 'cancelled' })
  })
  it('orders the active progress steps', () => {
    expect(ORDER_ITEM_PROGRESS).toEqual(['PENDING', 'COOKING', 'SERVED'])
  })
})
```

```ts
// src/entities/order/normalize.test.ts
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
      id: 'o1', status: 'OPEN', subtotal: 0, discountAmount: 0, total: 0,
      openedAt: '2026-06-29T10:00:00Z', items: undefined,
    })
    expect(order.items).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/entities/order`
Expected: FAIL — cannot find module `./status` / `./normalize`.

- [ ] **Step 3: Write the implementation**

```ts
// src/entities/order/model.ts
// Order domain types (mirror GET /api/qr/{qrToken}/order response `data`).

export type OrderItemStatus = 'PENDING' | 'COOKING' | 'SERVED' | 'CANCELLED'
export type OrderStatus = 'OPEN' | 'PAID' | 'CANCELLED'

export interface OrderItemOption {
  optionName: string
  priceDelta: number
}

export interface OrderItem {
  id: string
  menuItemId: string
  nameSnapshot: string
  unitPrice: number
  quantity: number
  note: string | null
  status: OrderItemStatus
  createdAt: string
  options: OrderItemOption[]
}

export interface Order {
  id: string
  status: OrderStatus
  subtotal: number
  discountAmount: number
  total: number
  openedAt: string
  items: OrderItem[]
}
```

```ts
// src/entities/order/status.ts
import type { OrderItemStatus } from './model'

interface StatusMeta {
  label: string
  tone: 'pending' | 'cooking' | 'served' | 'cancelled'
}

export const ORDER_ITEM_STATUS_META: Record<OrderItemStatus, StatusMeta> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'pending' },
  COOKING: { label: 'Đang nấu', tone: 'cooking' },
  SERVED: { label: 'Đã phục vụ', tone: 'served' },
  CANCELLED: { label: 'Đã hủy', tone: 'cancelled' },
}

/** The active lifecycle steps shown in the progress indicator (CANCELLED is terminal/aside). */
export const ORDER_ITEM_PROGRESS: OrderItemStatus[] = ['PENDING', 'COOKING', 'SERVED']
```

```ts
// src/entities/order/normalize.ts
import { toNumber } from '@/shared/lib/format'
import type { Order, OrderItem, OrderItemStatus, OrderStatus } from './model'

interface RawOrder {
  id: string
  status: OrderStatus
  subtotal: unknown
  discountAmount: unknown
  total: unknown
  openedAt: string
  items?: RawItem[]
}
interface RawItem {
  id: string
  menuItemId: string
  nameSnapshot: string
  unitPrice: unknown
  quantity: number
  note: string | null
  status: OrderItemStatus
  createdAt: string
  options?: { optionName: string; priceDelta: unknown }[]
}

export function normalizeOrder(raw: unknown): Order {
  const o = raw as RawOrder
  return {
    id: o.id,
    status: o.status,
    subtotal: toNumber(o.subtotal),
    discountAmount: toNumber(o.discountAmount),
    total: toNumber(o.total),
    openedAt: o.openedAt,
    items: (o.items ?? []).map(normalizeItem),
  }
}

function normalizeItem(raw: RawItem): OrderItem {
  return {
    id: raw.id,
    menuItemId: raw.menuItemId,
    nameSnapshot: raw.nameSnapshot,
    unitPrice: toNumber(raw.unitPrice),
    quantity: raw.quantity,
    note: raw.note,
    status: raw.status,
    createdAt: raw.createdAt,
    options: (raw.options ?? []).map((opt) => ({
      optionName: opt.optionName,
      priceDelta: toNumber(opt.priceDelta),
    })),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test src/entities/order`
Expected: PASS (both files).

- [ ] **Step 5: Commit**

```bash
git add src/entities/order
git commit -m "feat(web): order entity types, status metadata, normalizer"
```

---

### Task 2: `getOrder` server function

**Files:**
- Modify: `src/shared/api/order.ts` (append a new export)
- Test: `src/shared/api/order.getOrder.test.ts`

**Interfaces:**
- Consumes: `normalizeOrder` from `@/entities/order/normalize`, `API_BASE_URL` from `@/shared/config`.
- Produces: `getOrder` — a server function called as `getOrder({ data: { qrToken } })` resolving to `Order`. The underlying mapping is exposed as a tested helper `fetchOrder(qrToken: string): Promise<Order>` so the network + normalize path is unit-testable (server functions themselves are not invoked in unit tests, mirroring the existing untested `qr.ts` fns).

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/api/order.getOrder.test.ts
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
            id: 'o1', status: 'OPEN', subtotal: '50000', discountAmount: 0, total: '50000',
            openedAt: '2026-06-29T10:00:00Z',
            items: [{ id: 'it1', menuItemId: 'm1', nameSnapshot: 'Phở bò', unitPrice: '50000',
              quantity: 1, note: null, status: 'PENDING', createdAt: '2026-06-29T10:00:00Z', options: [] }],
          },
        }),
        { status: 200 },
      ),
    )
    const order = await fetchOrder('tok')
    expect(order.total).toBe(50000)
    expect(order.items[0].nameSnapshot).toBe('Phở bò')
  })

  it('throws a Vietnamese message on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 404 }))
    await expect(fetchOrder('tok')).rejects.toThrow('Phiên bàn không hợp lệ')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/shared/api/order.getOrder.test.ts`
Expected: FAIL — `fetchOrder` is not exported.

- [ ] **Step 3: Add the implementation to `src/shared/api/order.ts`**

Add the import at the top of the file (next to the existing imports):

```ts
import { normalizeOrder } from '@/entities/order/normalize'
import type { Order } from '@/entities/order/model'
```

Append at the end of the file:

```ts
/** Server-only: read the QR session's current order with item statuses. Exported for unit tests. */
export async function fetchOrder(qrToken: string): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/api/qr/${encodeURIComponent(qrToken)}/order`)
  if (!res.ok) {
    throw new Error(
      res.status === 404 ? 'Phiên bàn không hợp lệ' : `Không tải được đơn (${res.status})`,
    )
  }
  const json = (await res.json()) as { data: unknown }
  return normalizeOrder(json.data)
}

export const getOrder = createServerFn({ method: 'GET' })
  .validator((d: { qrToken: string }) => d)
  .handler(({ data }): Promise<Order> => fetchOrder(data.qrToken))
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/shared/api/order.getOrder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/order.ts src/shared/api/order.getOrder.test.ts
git commit -m "feat(web): add getOrder server fn (US-9.2 tracking)"
```

---

### Task 3: SSE proxy server route

**Files:**
- Create: `src/routes/api/qr.$qrToken.stream.ts`

**Interfaces:**
- Consumes: `API_BASE_URL` from `@/shared/config`.
- Produces: an HTTP endpoint `GET /api/qr/:qrToken/stream` that the browser opens with `new EventSource('/api/qr/<token>/stream')`. It proxies the BE SSE response body unchanged with `text/event-stream` headers.

> No unit test: this is a thin streaming proxy whose behavior is exercised by the Task 9 e2e and verified by typecheck. Manual verification step included below.

- [ ] **Step 1: Write the server route**

```ts
// src/routes/api/qr.$qrToken.stream.ts
import { createFileRoute } from '@tanstack/react-router'
import { API_BASE_URL } from '@/shared/config'

export const Route = createFileRoute('/api/qr/$qrToken/stream')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const upstream = await fetch(
          `${API_BASE_URL}/api/qr/${encodeURIComponent(params.qrToken)}/stream`,
          { headers: { accept: 'text/event-stream' } },
        )
        if (!upstream.ok || !upstream.body) {
          return new Response('stream unavailable', { status: upstream.status || 502 })
        }
        // Stream the BE Server-Sent Events straight through to the browser.
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
          },
        })
      },
    },
  },
})
```

- [ ] **Step 2: Regenerate the route tree + typecheck**

Run: `bun run build` (or the project's typecheck script, e.g. `bun run typecheck` if present)
Expected: build succeeds and `src/routeTree.gen.ts` now references the `/api/qr/$qrToken/stream` route.

- [ ] **Step 3: Manual verification (requires BE on :3000 + a seeded token)**

Run (in a terminal, with the dev server running):
`curl -N http://localhost:3001/api/qr/$E2E_QR_TOKEN/stream`
Expected: the connection stays open and prints `event: keep-alive` / `order_item.updated` SSE frames (Ctrl-C to stop).

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/qr.\$qrToken.stream.ts src/routeTree.gen.ts
git commit -m "feat(web): SSE proxy server route for order stream (US-9.2)"
```

---

### Task 4: `useOrderStream` hook (SSE + polling fallback)

**Files:**
- Create: `src/entities/order/useOrderStream.ts`
- Test: `src/entities/order/useOrderStream.test.ts`

**Interfaces:**
- Consumes: `getOrder` from `@/shared/api/order`, browser `EventSource`.
- Produces: `type StreamMode = 'live' | 'polling' | 'error'` and `useOrderStream(qrToken: string): { order: Order | null; mode: StreamMode; refetch: () => void }`.

Behavior contract:
- On mount: call `getOrder` once (initial load). On success set `order`; on failure with no order set `mode = 'error'`.
- Open `EventSource('/api/qr/<token>/stream')`. `onopen` → `mode = 'live'`. A message of type `order_item.updated` → re-call `getOrder` (full refetch).
- `onerror` → close the stream, `mode = 'polling'`, start polling `getOrder` every 2500ms, and attempt to reopen the stream every 5000ms. A successful reopen (`onopen`) stops the polling interval and returns to `live`.
- Unmount: close the stream and clear all timers.

- [ ] **Step 1: Write the failing test**

```ts
// src/entities/order/useOrderStream.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useOrderStream } from './useOrderStream'

vi.mock('@/shared/api/order', () => ({
  getOrder: vi.fn(),
}))
import { getOrder } from '@/shared/api/order'

const ORDER = {
  id: 'o1', status: 'OPEN', subtotal: 50000, discountAmount: 0, total: 50000,
  openedAt: '2026-06-29T10:00:00Z',
  items: [{ id: 'it1', menuItemId: 'm1', nameSnapshot: 'Phở bò', unitPrice: 50000, quantity: 1,
    note: null, status: 'PENDING', createdAt: '2026-06-29T10:00:00Z', options: [] }],
}

// Controllable EventSource mock.
class MockEventSource {
  static instances: MockEventSource[] = []
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {}
  closed = false
  constructor(public url: string) {
    MockEventSource.instances.push(this)
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  emit(type: string) {
    for (const fn of this.listeners[type] ?? []) fn(new MessageEvent(type))
  }
  close() {
    this.closed = true
  }
}

beforeEach(() => {
  MockEventSource.instances = []
  vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource)
  vi.mocked(getOrder).mockResolvedValue(ORDER as never)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useOrderStream', () => {
  it('loads the order and reports live once the stream opens', async () => {
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.order?.id).toBe('o1'))
    act(() => MockEventSource.instances[0].onopen?.())
    expect(result.current.mode).toBe('live')
  })

  it('refetches the order on an order_item.updated event', async () => {
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.order?.id).toBe('o1'))
    vi.mocked(getOrder).mockClear()
    act(() => MockEventSource.instances[0].emit('order_item.updated'))
    await waitFor(() => expect(getOrder).toHaveBeenCalledTimes(1))
  })

  it('falls back to polling when the stream errors', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useOrderStream('tok'))
    await vi.waitFor(() => expect(result.current.order?.id).toBe('o1'))
    act(() => MockEventSource.instances[0].onerror?.())
    expect(result.current.mode).toBe('polling')
    vi.mocked(getOrder).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(getOrder).toHaveBeenCalled()
  })

  it('reports error when the initial load fails', async () => {
    vi.mocked(getOrder).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useOrderStream('tok'))
    await waitFor(() => expect(result.current.mode).toBe('error'))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/entities/order/useOrderStream.test.ts`
Expected: FAIL — cannot find module `./useOrderStream`.

- [ ] **Step 3: Write the implementation**

```ts
// src/entities/order/useOrderStream.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { getOrder } from '@/shared/api/order'
import type { Order } from './model'

export type StreamMode = 'live' | 'polling' | 'error'

const POLL_MS = 2500
const RECONNECT_MS = 5000

export function useOrderStream(qrToken: string): {
  order: Order | null
  mode: StreamMode
  refetch: () => void
} {
  const [order, setOrder] = useState<Order | null>(null)
  const [mode, setMode] = useState<StreamMode>('polling')
  const orderRef = useRef<Order | null>(null)

  const load = useCallback(async () => {
    try {
      const next = await getOrder({ data: { qrToken } })
      orderRef.current = next
      setOrder(next)
      return true
    } catch {
      if (!orderRef.current) setMode('error')
      return false
    }
  }, [qrToken])

  useEffect(() => {
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
      const es = new EventSource(`/api/qr/${encodeURIComponent(qrToken)}/stream`)
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
      stopPolling()
      stream?.close()
    }
  }, [qrToken, load])

  return { order, mode, refetch: load }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/entities/order/useOrderStream.test.ts`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add src/entities/order/useOrderStream.ts src/entities/order/useOrderStream.test.ts
git commit -m "feat(web): useOrderStream hook (SSE live + polling fallback)"
```

---

### Task 5: `OrderStatusChip` + `OrderTracker` widget

**Files:**
- Create: `src/widgets/order-tracker/OrderStatusChip.tsx`
- Create: `src/widgets/order-tracker/OrderTracker.tsx`
- Test: `src/widgets/order-tracker/OrderTracker.test.tsx`

**Interfaces:**
- Consumes: `Order` / `OrderItemStatus` from `@/entities/order/model`, `ORDER_ITEM_STATUS_META` from `@/entities/order/status`, `StreamMode` from `@/entities/order/useOrderStream`, `formatVND` from `@/shared/lib/format`, `cn` from `@/shared/lib/cn`.
- Produces:
  - `OrderStatusChip({ status }: { status: OrderItemStatus })`.
  - `OrderTracker({ order, mode, backLink }: { order: Order; mode: StreamMode; backLink?: ReactNode })`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/widgets/order-tracker/OrderTracker.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderTracker } from './OrderTracker'
import type { Order } from '@/entities/order/model'

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    id: 'o1', status: 'OPEN', subtotal: 95000, discountAmount: 0, total: 95000,
    openedAt: '2026-06-29T10:00:00Z',
    items: [
      { id: 'a', menuItemId: 'm1', nameSnapshot: 'Phở bò', unitPrice: 50000, quantity: 1,
        note: 'Ít hành', status: 'COOKING', createdAt: '2026-06-29T10:00:00Z',
        options: [{ optionName: 'Tái', priceDelta: 0 }] },
      { id: 'b', menuItemId: 'm2', nameSnapshot: 'Bún chả', unitPrice: 45000, quantity: 1,
        note: null, status: 'SERVED', createdAt: '2026-06-29T10:01:00Z', options: [] },
    ],
    ...over,
  }
}

describe('OrderTracker', () => {
  it('renders each item with its status label, note and total', () => {
    render(<OrderTracker order={makeOrder()} mode="live" />)
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText('Đang nấu')).toBeInTheDocument()
    expect(screen.getByText('Đã phục vụ')).toBeInTheDocument()
    expect(screen.getByText(/Ít hành/)).toBeInTheDocument()
    expect(screen.getByText(/95[.,]000đ/)).toBeInTheDocument()
  })

  it('shows the live indicator in live mode', () => {
    render(<OrderTracker order={makeOrder()} mode="live" />)
    expect(screen.getByText('Đang cập nhật trực tiếp')).toBeInTheDocument()
  })

  it('shows the syncing indicator in polling mode', () => {
    render(<OrderTracker order={makeOrder()} mode="polling" />)
    expect(screen.getByText('Đang đồng bộ…')).toBeInTheDocument()
  })

  it('renders the empty state when there are no items', () => {
    render(<OrderTracker order={makeOrder({ items: [] })} mode="live" />)
    expect(screen.getByText('Chưa có món nào')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/widgets/order-tracker`
Expected: FAIL — cannot find module `./OrderTracker`.

- [ ] **Step 3: Write the implementations**

```tsx
// src/widgets/order-tracker/OrderStatusChip.tsx
import { cn } from '@/shared/lib/cn'
import type { OrderItemStatus } from '@/entities/order/model'
import { ORDER_ITEM_STATUS_META } from '@/entities/order/status'

const TONE_CLASS: Record<string, string> = {
  pending: 'bg-page text-muted',
  cooking: 'bg-amber-100 text-amber-700',
  served: 'bg-ok-bg text-ok-text',
  cancelled: 'bg-red-50 text-red-600',
}

export function OrderStatusChip({ status }: { status: OrderItemStatus }) {
  const meta = ORDER_ITEM_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold',
        TONE_CLASS[meta.tone],
      )}
    >
      {meta.label}
    </span>
  )
}
```

```tsx
// src/widgets/order-tracker/OrderTracker.tsx
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { formatVND } from '@/shared/lib/format'
import type { Order, StreamMode } from '@/entities/order/model'
import { OrderStatusChip } from './OrderStatusChip'

interface Props {
  order: Order
  mode: StreamMode
  /** e.g. a router Link back to the menu, rendered in the footer. */
  backLink?: ReactNode
}

export function OrderTracker({ order, mode, backLink }: Props) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <div className="text-lg font-extrabold text-ink">Đơn của bạn</div>
        <ConnectionDot mode={mode} />
      </div>

      {order.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm text-muted">
          <p>Chưa có món nào</p>
          {backLink}
        </div>
      ) : (
        <>
          <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 border-b border-line py-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'truncate font-bold text-ink',
                      item.status === 'CANCELLED' && 'text-muted line-through',
                    )}
                  >
                    {item.quantity}× {item.nameSnapshot}
                  </div>
                  {item.options.length > 0 && (
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {item.options.map((o) => o.optionName).join(', ')}
                    </div>
                  )}
                  {item.note && <div className="mt-0.5 truncate text-xs text-muted">{item.note}</div>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <OrderStatusChip status={item.status} />
                  <span className="text-xs font-semibold text-muted">
                    {formatVND(item.unitPrice * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-line px-6 py-5">
            <div className="flex justify-between pb-2 text-sm">
              <span className="text-muted">Tạm tính</span>
              <span className="font-semibold text-ink">{formatVND(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between pb-2 text-sm">
                <span className="text-muted">Giảm giá</span>
                <span className="font-semibold text-ink">−{formatVND(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-bold text-ink">Tổng cộng</span>
              <span className="text-xl font-extrabold text-ink">{formatVND(order.total)}</span>
            </div>
            {backLink && <div className="mt-4">{backLink}</div>}
          </div>
        </>
      )}
    </div>
  )
}

function ConnectionDot({ mode }: { mode: StreamMode }) {
  const live = mode === 'live'
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
      <span
        className={cn(
          'size-2 rounded-full',
          live ? 'bg-emerald-500' : 'bg-amber-500',
          live && 'animate-pulse',
        )}
      />
      {live ? 'Đang cập nhật trực tiếp' : 'Đang đồng bộ…'}
    </span>
  )
}
```

Also re-export `StreamMode` from the entity model barrel so the widget import in the snippet above resolves. Add to `src/entities/order/model.ts` is wrong (it has no hook import); instead change the `OrderTracker.tsx` import line to pull `StreamMode` from the hook:

```tsx
// In OrderTracker.tsx, replace the model import line with:
import type { Order } from '@/entities/order/model'
import type { StreamMode } from '@/entities/order/useOrderStream'
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/widgets/order-tracker`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/order-tracker
git commit -m "feat(web): OrderTracker widget + status chip"
```

---

### Task 6: `CustomerOrderPage`

**Files:**
- Create: `src/pages/customer-order/CustomerOrderPage.tsx`
- Test: `src/pages/customer-order/CustomerOrderPage.test.tsx`

**Interfaces:**
- Consumes: `useOrderStream` from `@/entities/order/useOrderStream`, `OrderTracker` from `@/widgets/order-tracker/OrderTracker`, `Button` from `@/shared/ui`.
- Produces: `CustomerOrderPage({ qrToken, backLink }: { qrToken: string; backLink?: ReactNode })`. Renders loading / error / tracker. The route (Task 7) passes the back `Link` so this page stays router-context-free for tests.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/customer-order/CustomerOrderPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CustomerOrderPage } from './CustomerOrderPage'

vi.mock('@/entities/order/useOrderStream', () => ({
  useOrderStream: vi.fn(),
}))
import { useOrderStream } from '@/entities/order/useOrderStream'

const ORDER = {
  id: 'o1', status: 'OPEN', subtotal: 50000, discountAmount: 0, total: 50000,
  openedAt: '2026-06-29T10:00:00Z',
  items: [{ id: 'a', menuItemId: 'm1', nameSnapshot: 'Phở bò', unitPrice: 50000, quantity: 1,
    note: null, status: 'PENDING', createdAt: '2026-06-29T10:00:00Z', options: [] }],
}

beforeEach(() => vi.clearAllMocks())

describe('CustomerOrderPage', () => {
  it('shows a loading state before the order arrives', () => {
    vi.mocked(useOrderStream).mockReturnValue({ order: null, mode: 'polling', refetch: vi.fn() })
    render(<CustomerOrderPage qrToken="tok" />)
    expect(screen.getByText('Đang tải đơn…')).toBeInTheDocument()
  })

  it('shows an error state with a retry button', () => {
    const refetch = vi.fn()
    vi.mocked(useOrderStream).mockReturnValue({ order: null, mode: 'error', refetch })
    render(<CustomerOrderPage qrToken="tok" />)
    expect(screen.getByText('Không tải được đơn')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Thử lại' }).click()
    expect(refetch).toHaveBeenCalled()
  })

  it('renders the tracker once the order is loaded', () => {
    vi.mocked(useOrderStream).mockReturnValue({ order: ORDER as never, mode: 'live', refetch: vi.fn() })
    render(<CustomerOrderPage qrToken="tok" />)
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/pages/customer-order`
Expected: FAIL — cannot find module `./CustomerOrderPage`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/pages/customer-order/CustomerOrderPage.tsx
import type { ReactNode } from 'react'
import { useOrderStream } from '@/entities/order/useOrderStream'
import { OrderTracker } from '@/widgets/order-tracker/OrderTracker'
import { Button } from '@/shared/ui'

interface Props {
  qrToken: string
  /** Router Link back to the menu, forwarded to the tracker. */
  backLink?: ReactNode
}

export function CustomerOrderPage({ qrToken, backLink }: Props) {
  const { order, mode, refetch } = useOrderStream(qrToken)

  if (!order && mode === 'error') {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-bold text-ink">Không tải được đơn</h1>
        <p className="text-sm text-muted">Vui lòng thử lại sau giây lát.</p>
        <Button onClick={refetch}>Thử lại</Button>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 text-sm text-muted">
        Đang tải đơn…
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl">
      <OrderTracker order={order} mode={mode} backLink={backLink} />
    </main>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/pages/customer-order`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add src/pages/customer-order
git commit -m "feat(web): CustomerOrderPage (loading/error/tracker states)"
```

---

### Task 7: Wire the `/t/$qrToken/order` route

**Files:**
- Create: `src/routes/t.$qrToken.order.tsx`

**Interfaces:**
- Consumes: `CustomerOrderPage` from `@/pages/customer-order/CustomerOrderPage`.
- Produces: route `/t/$qrToken/order`. Passes a back `Link` to `/t/$qrToken`.

- [ ] **Step 1: Write the route**

```tsx
// src/routes/t.$qrToken.order.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { CustomerOrderPage } from '@/pages/customer-order/CustomerOrderPage'
import { Button } from '@/shared/ui'

export const Route = createFileRoute('/t/$qrToken/order')({
  component: OrderRoute,
})

function OrderRoute() {
  const { qrToken } = Route.useParams()
  return (
    <CustomerOrderPage
      qrToken={qrToken}
      backLink={
        <Link to="/t/$qrToken" params={{ qrToken }} className="block">
          <Button variant="outline" fullWidth>
            Gọi thêm món
          </Button>
        </Link>
      }
    />
  )
}
```

> If `Button` has no `variant="outline"`, check `src/shared/ui` for the available variants and use the closest secondary style (e.g. the default or a `ghost`/`secondary` variant). Verify by opening `src/shared/ui` before writing.

- [ ] **Step 2: Regenerate routes + typecheck**

Run: `bun run build`
Expected: build succeeds; `src/routeTree.gen.ts` references `/t/$qrToken/order`.

- [ ] **Step 3: Run the full unit suite**

Run: `bun run test`
Expected: PASS (no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/routes/t.\$qrToken.order.tsx src/routeTree.gen.ts
git commit -m "feat(web): /t/:token/order route"
```

---

### Task 8: Nav entry + auto-navigate after submit

**Files:**
- Modify: `src/widgets/top-nav/TopNav.tsx`
- Modify: `src/widgets/top-nav/TopNav.test.tsx`
- Modify: `src/pages/customer-menu/CustomerMenuPage.tsx`
- Modify: `src/pages/customer-menu/CustomerMenuPage.test.tsx`
- Modify: `src/routes/t.$qrToken.tsx`

**Interfaces:**
- `TopNav` gains an optional prop `onViewOrder?: () => void`; when provided it renders a "Đơn của bạn" button (Phosphor `Receipt` icon) that calls it.
- `CustomerMenuPage` gains optional props `onViewOrder?: () => void` and `onSubmitted?: () => void`; it calls `onSubmitted` after a successful submit (in addition to the existing notice + cart clear) and forwards `onViewOrder` to `TopNav`.
- The route `t.$qrToken.tsx` wires both to `navigate({ to: '/t/$qrToken/order', params })`.

- [ ] **Step 1: Add the failing TopNav test**

Add to `src/widgets/top-nav/TopNav.test.tsx`:

```tsx
it('calls onViewOrder when the order button is clicked', () => {
  const onViewOrder = vi.fn()
  renderTopNav({ onViewOrder }) // extend the existing render helper to spread extra props
  fireEvent.click(screen.getByRole('button', { name: 'Xem đơn của bạn' }))
  expect(onViewOrder).toHaveBeenCalled()
})
```

> Open `TopNav.test.tsx` first and match its existing render helper/prop-passing style; if there is no helper, render `<TopNav {...baseProps} onViewOrder={onViewOrder} />` with the props the other tests already use.

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/widgets/top-nav`
Expected: FAIL — no button named "Xem đơn của bạn".

- [ ] **Step 3: Implement in `TopNav.tsx`**

Add `Receipt` to the Phosphor import:

```tsx
import { MagnifyingGlass, ShoppingCart, Receipt } from '@phosphor-icons/react'
```

Add `onViewOrder?: () => void` to the `Props` interface and destructure it. Then, immediately before the cart `<button>` inside the right-hand `<div className="flex items-center gap-3">`, add:

```tsx
{onViewOrder && (
  <button
    type="button"
    onClick={onViewOrder}
    aria-label="Xem đơn của bạn"
    className="flex size-10 shrink-0 items-center justify-center rounded-control border border-line-strong bg-white text-ink transition-colors hover:bg-page"
  >
    <Receipt size={20} weight="regular" />
  </button>
)}
```

- [ ] **Step 4: Run the TopNav test to verify it passes**

Run: `bun run test src/widgets/top-nav`
Expected: PASS.

- [ ] **Step 5: Add the failing CustomerMenuPage test**

Add to `src/pages/customer-menu/CustomerMenuPage.test.tsx` (the `setup` helper already renders the page — extend it to accept and pass `onSubmitted`/`onViewOrder`, defaulting to `vi.fn()`):

```tsx
it('calls onSubmitted after a successful submit', async () => {
  const onSubmitted = vi.fn()
  setup({ q: '', cat: 'all' }, { onSubmitted })
  fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
  openCart()
  fireEvent.click(await screen.findByRole('button', { name: /Gửi bếp/ }))
  await screen.findByText(/Đã gửi/)
  expect(onSubmitted).toHaveBeenCalled()
})

it('calls onViewOrder from the nav order button', () => {
  const onViewOrder = vi.fn()
  setup({ q: '', cat: 'all' }, { onViewOrder })
  fireEvent.click(screen.getByRole('button', { name: 'Xem đơn của bạn' }))
  expect(onViewOrder).toHaveBeenCalled()
})
```

> Update the `setup` signature to `function setup(search = { q: '', cat: 'all' }, extra: Partial<{ onSubmitted: () => void; onViewOrder: () => void }> = {})` and pass `onSubmitted={extra.onSubmitted}` / `onViewOrder={extra.onViewOrder}` to `<CustomerMenuPage>`.

- [ ] **Step 6: Run it to verify it fails**

Run: `bun run test src/pages/customer-menu`
Expected: FAIL — `onViewOrder`/`onSubmitted` not handled (no order button; `onSubmitted` undefined).

- [ ] **Step 7: Implement in `CustomerMenuPage.tsx`**

Add to `Props`:

```tsx
  onViewOrder?: () => void
  onSubmitted?: () => void
```

Destructure them in the component signature. In `onSubmit`, after `setNotice('Đã gửi đơn tới bếp!')`, add:

```tsx
      onSubmitted?.()
```

Pass `onViewOrder` to `TopNav`:

```tsx
      <TopNav
        restaurant={restaurant}
        table={table}
        query={search.q}
        onQueryChange={(q) => onSearchChange({ q })}
        cartCount={cartCount(cart)}
        onOpenCart={() => setSheetOpen(true)}
        onViewOrder={onViewOrder}
      />
```

- [ ] **Step 8: Run the CustomerMenuPage tests to verify they pass**

Run: `bun run test src/pages/customer-menu`
Expected: PASS (existing + 2 new).

- [ ] **Step 9: Wire navigation in `src/routes/t.$qrToken.tsx`**

In `CustomerMenuRoute`, add a handler and pass both props:

```tsx
  const goToOrder = () => navigate({ to: '/t/$qrToken/order', params: { qrToken: params.qrToken } })
  return (
    <CustomerMenuPage
      context={context}
      menu={menu}
      search={search}
      onSearchChange={setSearch}
      qrToken={params.qrToken}
      onViewOrder={goToOrder}
      onSubmitted={goToOrder}
    />
  )
```

> `navigate` is already obtained via `Route.useNavigate()` in this component; reuse it.

- [ ] **Step 10: Typecheck + full suite**

Run: `bun run build && bun run test`
Expected: build succeeds, all unit tests PASS.

- [ ] **Step 11: Commit**

```bash
git add src/widgets/top-nav src/pages/customer-menu src/routes/t.\$qrToken.tsx
git commit -m "feat(web): nav order entry + auto-navigate to tracking after submit"
```

---

### Task 9: E2E — submit then track

**Files:**
- Create: `e2e/order-tracking.spec.ts`

**Interfaces:**
- Consumes: a running BE on `API_BASE_URL` and a seeded `process.env.E2E_QR_TOKEN` (e.g. `qr-table-01`).

- [ ] **Step 1: Write the e2e spec**

```ts
// e2e/order-tracking.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Customer order tracking (US-9.2)', () => {
  test('submitting an order navigates to the live tracker', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'Set E2E_QR_TOKEN to a seeded table token to run this test')

    await page.goto(`/t/${token}`)
    // Add the first dish to the cart.
    await page.locator('[data-dish] button', { hasText: /Thêm|\+/ }).first().click()
    // Open the cart drawer and submit.
    await page.getByRole('button', { name: /Mở giỏ hàng/ }).click()
    await page.getByRole('button', { name: /Gửi bếp/ }).click()

    // Auto-navigated to the tracking page.
    await expect(page).toHaveURL(new RegExp(`/t/${token}/order`))
    await expect(page.getByText('Đơn của bạn')).toBeVisible()
    // The submitted item shows the initial PENDING label.
    await expect(page.getByText('Chờ xác nhận').first()).toBeVisible()
    // A connection indicator is present (live or syncing).
    await expect(page.getByText(/Đang (cập nhật trực tiếp|đồng bộ)/)).toBeVisible()
  })

  test('visiting the order route directly renders the tracker shell', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'needs a seeded qr_token')
    await page.goto(`/t/${token}/order`)
    await expect(page.getByText('Đơn của bạn')).toBeVisible()
  })
})
```

> Open `src/widgets/menu-grid/MenuGrid.tsx` to confirm the add-to-cart button's accessible name/selector and adjust the `[data-dish] button` locator to match (the unit tests use the name `Thêm <dish>`).

- [ ] **Step 2: Run the e2e (with BE + seeded token) or confirm it skips cleanly**

Run: `bun run test:e2e` (or the project's Playwright script) with `E2E_QR_TOKEN` set.
Expected: PASS when the token is set; SKIPPED (not failed) when it is not.

- [ ] **Step 3: Commit**

```bash
git add e2e/order-tracking.spec.ts
git commit -m "test(web): e2e order tracking happy path (US-9.2)"
```

---

## Self-Review

**Spec coverage:**
- Dedicated route `/t/:token/order` → Task 7. ✓
- `getOrder` server-fn (initial load + poll) → Task 2. ✓
- SSE proxy Start route → Task 3. ✓
- Refetch-on-event + polling fallback + reconnect → Task 4. ✓
- Order entity types + status metadata → Task 1. ✓
- `useOrderStream` boundary `{ order, mode, refetch }` → Task 4. ✓
- `order-tracker` widget (header, item list, totals, back link, connection indicator) → Task 5. ✓
- UI states loading/empty/error/loaded + indicator → Tasks 5 (empty/indicator) + 6 (loading/error/loaded). ✓
- Decision A (auto-navigate after submit) → Task 8. ✓
- Decision B (full refetch on event) → Task 4. ✓
- Decision C (e2e to PENDING only) → Task 9. ✓
- Nav "Đơn của bạn" entry → Task 8. ✓
- Tests: unit (Tasks 1,2,4,5,6,8) + e2e (Task 9). ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. The two advisory notes (Button variant in Task 7, add-to-cart selector in Task 9) instruct verifying an existing name against real source rather than leaving logic unwritten.

**Type consistency:** `Order`/`OrderItem`/`OrderItemStatus`/`OrderStatus` defined in Task 1 and consumed unchanged in Tasks 2/4/5/6. `StreamMode` defined in Task 4, imported from `@/entities/order/useOrderStream` in Tasks 5/6 (the Task 5 step explicitly corrects the import path). `useOrderStream` returns `{ order, mode, refetch }` consistently across Tasks 4/6. `getOrder({ data: { qrToken } })` call shape matches the validator in Task 2 and the existing `qr.ts` convention.
