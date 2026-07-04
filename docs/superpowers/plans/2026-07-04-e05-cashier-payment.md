# E05 Cashier & Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the cashier a master-detail screen to view open tables, open a bill, apply a discount, take payment, and print an invoice — completing the order → cook → pay → close lifecycle.

**Architecture:** Follow the existing `/kitchen` staff area exactly. A role-guarded `/cashier` route tree renders a master-detail page: `useOpenTables` (SSE + polling, mirroring `useKitchenStream`) drives a left table list; selecting a table fetches bill detail into a right panel that hosts the discount form and payment action. All BE calls go through the established server-function proxy pattern (`shared/api/*.server.ts` raw fetch via `authedFetch` + `shared/api/*.ts` `createServerFn` wrappers). Types live in `shared/api/types/` (FSD: `shared` cannot import `entities`) and are re-exported by `entities/cashier`.

**Tech Stack:** TanStack Start (file-based routes, `createServerFn`), React, Tailwind, `@phosphor-icons/react`, Vitest + Testing Library, Playwright. Bun runtime, dev on port 3001, BE on :3000.

## Global Constraints

- FSD layer rules are lint-enforced (`bun run lint:fsd`): `shared` must not import `entities`/`widgets`/`pages`; imports cross a slice boundary only through its `index.ts` public API (no path-sidestep).
- Money values arrive from the BE as strings in several responses — always normalize to `number`; display with `formatVND` from `@/shared/lib/format`.
- Staff area auth: guard in the route `beforeLoad` fetches the session **once** and passes it via context; on session failure redirect to the area login (mirror `src/routes/kitchen.tsx`, PR #11 behavior — never trigger a second refresh).
- SSE stream URL: `/api/stream/restaurant/${session.restaurantId}`; event name `order_item.updated`; on SSE error fall back to polling every 2500ms (mirror `src/entities/kitchen/useKitchenStream.ts`).
- Roles: `'ADMIN' | 'KITCHEN' | 'CASHIER'`. Cashier area allows `CASHIER` + `ADMIN`.
- All user-facing copy in Vietnamese (match existing screens).
- Run a single test file with `bunx vitest run <path>`; typecheck with `bun run typecheck`; e2e with `bun run test:e2e`.

---

## File Structure

- `src/shared/api/types/cashier.ts` — CREATE — cashier DTO types (single source of truth).
- `src/shared/api/cashier-normalize.ts` — CREATE — raw JSON → typed, money strings → numbers.
- `src/shared/api/cashier.server.ts` — CREATE — raw `authedFetch` calls to the BE cashier endpoints.
- `src/shared/api/cashier.ts` — CREATE — `createServerFn` wrappers.
- `src/entities/cashier/model.ts` — CREATE — re-export types from `shared/api/types/cashier`.
- `src/entities/cashier/useOpenTables.ts` — CREATE — SSE + polling hook for the open-tables list.
- `src/entities/cashier/index.ts` — CREATE — public API.
- `src/widgets/cashier-table-list/CashierTableList.tsx` (+ `index.ts`, test) — CREATE — left column.
- `src/widgets/cashier-bill-panel/CashierBillPanel.tsx` (+ `index.ts`, test) — CREATE — right column (bill + discount + payment).
- `src/widgets/invoice-receipt/InvoiceReceipt.tsx` (+ `index.ts`, test) — CREATE — printable receipt.
- `src/pages/cashier-screen/CashierScreenPage.tsx` (+ `index.ts`) — CREATE — master-detail composition + data flow.
- `src/routes/cashier.tsx` — CREATE — guard shell + `resolveCashierAccess` (+ test).
- `src/routes/cashier.login.tsx` — CREATE — login route (reuses `StaffLoginPage`).
- `src/routes/cashier.index.tsx` — CREATE — renders `CashierScreenPage`.
- `e2e/cashier.spec.ts` — CREATE — smoke test.

---

## Task 1: Cashier types + normalizers

**Files:**
- Create: `src/shared/api/types/cashier.ts`
- Create: `src/shared/api/cashier-normalize.ts`
- Create: `src/shared/api/cashier-normalize.test.ts`

**Interfaces:**
- Produces: types `CashierTable`, `BillOption`, `BillItem`, `BillDetail`, `DiscountType = 'PERCENT' | 'FIXED'`, `PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD'`; functions `normalizeCashierTable(raw: unknown): CashierTable`, `normalizeBillDetail(raw: unknown): BillDetail`.

- [ ] **Step 1: Write the types file**

Create `src/shared/api/types/cashier.ts`:

```ts
export type DiscountType = 'PERCENT' | 'FIXED'
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD'
export type OrderItemStatus = 'PENDING' | 'COOKING' | 'SERVED' | 'CANCELLED'

/** One open table as shown in the cashier list. */
export interface CashierTable {
  orderId: string
  tableId: string
  tableName: string
  subtotal: number
  discountAmount: number
  total: number
  openedAt: string
  itemCount: number
}

export interface BillOption {
  optionName: string
  priceDelta: number
}

export interface BillItem {
  id: string
  nameSnapshot: string
  unitPrice: number
  quantity: number
  note: string | null
  status: OrderItemStatus
  options: BillOption[]
}

/** Full bill for one order. */
export interface BillDetail {
  orderId: string
  status: 'OPEN' | 'PAID' | 'CANCELLED'
  subtotal: number
  discountAmount: number
  discountReason: string | null
  total: number
  openedAt: string
  items: BillItem[]
}
```

- [ ] **Step 2: Write the failing test**

Create `src/shared/api/cashier-normalize.test.ts`:

```ts
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
      items: [{ id: 'i9', nameSnapshot: 'Trà đá', unitPrice: 5000, quantity: 1, status: 'PENDING' }],
    })
    expect(bill.discountReason).toBeNull()
    expect(bill.items[0].options).toEqual([])
    expect(bill.items[0].note).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bunx vitest run src/shared/api/cashier-normalize.test.ts`
Expected: FAIL — `normalizeCashierTable`/`normalizeBillDetail` not exported.

- [ ] **Step 4: Write the normalizers**

Create `src/shared/api/cashier-normalize.ts`:

```ts
import type {
  BillDetail,
  BillItem,
  BillOption,
  CashierTable,
  OrderItemStatus,
} from '@/shared/api/types/cashier'

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

export function normalizeCashierTable(raw: unknown): CashierTable {
  const r = raw as Record<string, unknown>
  return {
    orderId: str(r.orderId),
    tableId: str(r.tableId),
    tableName: str(r.tableName),
    subtotal: num(r.subtotal),
    discountAmount: num(r.discountAmount),
    total: num(r.total),
    openedAt: str(r.openedAt),
    itemCount: num(r.itemCount),
  }
}

function normalizeOption(raw: unknown): BillOption {
  const r = raw as Record<string, unknown>
  return { optionName: str(r.optionName), priceDelta: num(r.priceDelta) }
}

function normalizeItem(raw: unknown): BillItem {
  const r = raw as Record<string, unknown>
  return {
    id: str(r.id),
    nameSnapshot: str(r.nameSnapshot),
    unitPrice: num(r.unitPrice),
    quantity: num(r.quantity),
    note: r.note == null ? null : String(r.note),
    status: (r.status as OrderItemStatus) ?? 'PENDING',
    options: Array.isArray(r.options) ? r.options.map(normalizeOption) : [],
  }
}

export function normalizeBillDetail(raw: unknown): BillDetail {
  const r = raw as Record<string, unknown>
  return {
    orderId: str(r.id ?? r.orderId),
    status: (r.status as BillDetail['status']) ?? 'OPEN',
    subtotal: num(r.subtotal),
    discountAmount: num(r.discountAmount),
    discountReason: r.discountReason == null ? null : String(r.discountReason),
    total: num(r.total),
    openedAt: str(r.openedAt),
    items: Array.isArray(r.items) ? r.items.map(normalizeItem) : [],
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bunx vitest run src/shared/api/cashier-normalize.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/types/cashier.ts src/shared/api/cashier-normalize.ts src/shared/api/cashier-normalize.test.ts
git commit -m "feat(cashier): cashier DTO types + response normalizers"
```

---

## Task 2: Cashier server API layer

**Files:**
- Create: `src/shared/api/cashier.server.ts`
- Create: `src/shared/api/cashier.ts`

**Interfaces:**
- Consumes: `normalizeCashierTable`, `normalizeBillDetail` (Task 1); `authedFetch`, `type TokenStore`, `cookieTokenStore` from `@/shared/lib/staff-auth.server`.
- Produces: server functions `getOpenTables(): Promise<CashierTable[]>`, `getBillDetail({ data: { id } }): Promise<BillDetail>`, `applyOrderDiscount({ data: { id, type, value, reason } }): Promise<void>`, `payOrder({ data: { id, method } }): Promise<void>`.

- [ ] **Step 1: Write the raw fetch layer**

Create `src/shared/api/cashier.server.ts` (mirrors `kitchen.server.ts`):

```ts
import { authedFetch, type TokenStore } from '@/shared/lib/staff-auth.server'
import { normalizeBillDetail, normalizeCashierTable } from '@/shared/api/cashier-normalize'
import type {
  BillDetail,
  CashierTable,
  DiscountType,
  PaymentMethod,
} from '@/shared/api/types/cashier'

async function readData<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Backend error (${res.status})`)
  return ((await res.json()) as { data: T }).data
}

const jsonHeaders = { 'content-type': 'application/json' }

export async function fetchOpenTables(store: TokenStore): Promise<CashierTable[]> {
  const data = await readData<{ tables: unknown[] }>(
    await authedFetch(store, '/api/cashier/tables'),
  )
  return data.tables.map(normalizeCashierTable)
}

export async function fetchBillDetail(store: TokenStore, id: string): Promise<BillDetail> {
  const data = await readData<unknown>(
    await authedFetch(store, `/api/cashier/orders/${encodeURIComponent(id)}`),
  )
  return normalizeBillDetail(data)
}

export async function applyDiscount(
  store: TokenStore,
  input: { id: string; type: DiscountType; value: number; reason: string },
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/cashier/orders/${encodeURIComponent(input.id)}/discount`,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ type: input.type, value: input.value, reason: input.reason }),
    },
  )
  if (!res.ok) throw new Error(`Không áp dụng được giảm giá (${res.status})`)
}

export async function takePayment(
  store: TokenStore,
  input: { id: string; method: PaymentMethod },
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/cashier/orders/${encodeURIComponent(input.id)}/payment`,
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ method: input.method }) },
  )
  if (!res.ok) throw new Error(`Không thanh toán được (${res.status})`)
}
```

- [ ] **Step 2: Write the server-function wrappers**

Create `src/shared/api/cashier.ts` (mirrors `kitchen.ts`):

```ts
import { createServerFn } from '@tanstack/react-start'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'
import {
  applyDiscount,
  fetchBillDetail,
  fetchOpenTables,
  takePayment,
} from '@/shared/api/cashier.server'
import type {
  BillDetail,
  CashierTable,
  DiscountType,
  PaymentMethod,
} from '@/shared/api/types/cashier'

export const getOpenTables = createServerFn({ method: 'GET' }).handler(
  (): Promise<CashierTable[]> => fetchOpenTables(cookieTokenStore),
)

export const getBillDetail = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(({ data }): Promise<BillDetail> => fetchBillDetail(cookieTokenStore, data.id))

export const applyOrderDiscount = createServerFn({ method: 'POST' })
  .validator((d: { id: string; type: DiscountType; value: number; reason: string }) => d)
  .handler(({ data }): Promise<void> => applyDiscount(cookieTokenStore, data))

export const payOrder = createServerFn({ method: 'POST' })
  .validator((d: { id: string; method: PaymentMethod }) => d)
  .handler(({ data }): Promise<void> => takePayment(cookieTokenStore, data))
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS (no errors introduced).

- [ ] **Step 4: Commit**

```bash
git add src/shared/api/cashier.server.ts src/shared/api/cashier.ts
git commit -m "feat(cashier): server-function API for tables, bill, discount, payment"
```

---

## Task 3: Cashier entity — types re-export + `useOpenTables` hook

**Files:**
- Create: `src/entities/cashier/model.ts`
- Create: `src/entities/cashier/useOpenTables.ts`
- Create: `src/entities/cashier/useOpenTables.test.ts`
- Create: `src/entities/cashier/index.ts`

**Interfaces:**
- Consumes: `getOpenTables` (Task 2); types from `@/shared/api/types/cashier`.
- Produces: `useOpenTables(restaurantId: string): { tables: CashierTable[]; mode: StreamMode; refetch: () => void }` where `StreamMode = 'live' | 'polling' | 'error'`; `entities/cashier` public API re-exporting the types + hook.

- [ ] **Step 1: Write the model re-export**

Create `src/entities/cashier/model.ts` (mirrors `entities/staff/model.ts`):

```ts
export type {
  BillDetail,
  BillItem,
  BillOption,
  CashierTable,
  DiscountType,
  OrderItemStatus,
  PaymentMethod,
} from '@/shared/api/types/cashier'
```

- [ ] **Step 2: Write the failing test**

Create `src/entities/cashier/useOpenTables.test.ts` (mirrors `useKitchenStream.test.ts` — a `FakeEventSource` in happy-dom):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOpenTables } from './useOpenTables'

const tables = [
  {
    orderId: 'o1',
    tableId: 't1',
    tableName: 'Bàn 5',
    subtotal: 410000,
    discountAmount: 0,
    total: 410000,
    openedAt: '2026-07-04T10:00:00Z',
    itemCount: 4,
  },
]

vi.mock('@/shared/api/cashier', () => ({
  getOpenTables: vi.fn(() => Promise.resolve(tables)),
}))

class FakeEventSource {
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  addEventListener() {}
  close() {}
}

beforeEach(() => {
  ;(globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource
})

describe('useOpenTables', () => {
  it('loads the open tables on mount', async () => {
    const { result } = renderHook(() => useOpenTables('r1'))
    await waitFor(() => expect(result.current.tables).toHaveLength(1))
    expect(result.current.tables[0].tableName).toBe('Bàn 5')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bunx vitest run src/entities/cashier/useOpenTables.test.ts`
Expected: FAIL — `useOpenTables` not found.

- [ ] **Step 4: Write the hook**

Create `src/entities/cashier/useOpenTables.ts` (mirrors `useKitchenStream.ts`, single list):

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { getOpenTables } from '@/shared/api/cashier'
import type { CashierTable } from './model'

export type StreamMode = 'live' | 'polling' | 'error'

const POLL_MS = 2500
const RECONNECT_MS = 5000

export function useOpenTables(restaurantId: string): {
  tables: CashierTable[]
  mode: StreamMode
  refetch: () => void
} {
  const [tables, setTables] = useState<CashierTable[]>([])
  const [mode, setMode] = useState<StreamMode>('polling')
  const loadedRef = useRef(false)
  const disposedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const next = await getOpenTables()
      if (disposedRef.current) return
      loadedRef.current = true
      setTables(next)
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
    tables,
    mode,
    refetch: () => {
      void load()
    },
  }
}
```

- [ ] **Step 5: Write the public API**

Create `src/entities/cashier/index.ts`:

```ts
export * from './model'
export { useOpenTables, type StreamMode } from './useOpenTables'
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bunx vitest run src/entities/cashier/useOpenTables.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/entities/cashier/
git commit -m "feat(cashier): entity types + useOpenTables SSE/polling hook"
```

---

## Task 4: `CashierTableList` widget (left column)

**Files:**
- Create: `src/widgets/cashier-table-list/CashierTableList.tsx`
- Create: `src/widgets/cashier-table-list/CashierTableList.test.tsx`
- Create: `src/widgets/cashier-table-list/index.ts`

**Interfaces:**
- Consumes: `CashierTable` (Task 3), `formatVND` from `@/shared/lib/format`.
- Produces: `CashierTableList({ tables, selectedOrderId, onSelect }: { tables: CashierTable[]; selectedOrderId: string | null; onSelect: (orderId: string) => void })`.

- [ ] **Step 1: Write the failing test**

Create `src/widgets/cashier-table-list/CashierTableList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CashierTableList } from './CashierTableList'
import type { CashierTable } from '@/entities/cashier'

const tables: CashierTable[] = [
  {
    orderId: 'o1',
    tableId: 't1',
    tableName: 'Bàn 5',
    subtotal: 410000,
    discountAmount: 0,
    total: 410000,
    openedAt: '2026-07-04T10:00:00Z',
    itemCount: 4,
  },
]

describe('CashierTableList', () => {
  it('renders a table row with its total and fires onSelect', () => {
    const onSelect = vi.fn()
    render(<CashierTableList tables={tables} selectedOrderId={null} onSelect={onSelect} />)
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
    expect(screen.getByText('410.000đ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bàn 5/ }))
    expect(onSelect).toHaveBeenCalledWith('o1')
  })

  it('shows an empty state when there are no open tables', () => {
    render(<CashierTableList tables={[]} selectedOrderId={null} onSelect={() => {}} />)
    expect(screen.getByText('Chưa có bàn nào mở')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/widgets/cashier-table-list/CashierTableList.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the widget**

Create `src/widgets/cashier-table-list/CashierTableList.tsx`:

```tsx
import { formatVND } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import type { CashierTable } from '@/entities/cashier'

interface Props {
  tables: CashierTable[]
  selectedOrderId: string | null
  onSelect: (orderId: string) => void
}

export function CashierTableList({ tables, selectedOrderId, onSelect }: Props) {
  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Chưa có bàn nào mở
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 p-3">
      {tables.map((t) => (
        <li key={t.orderId}>
          <button
            type="button"
            onClick={() => onSelect(t.orderId)}
            aria-pressed={selectedOrderId === t.orderId}
            className={cn(
              'flex w-full flex-col gap-1 rounded-card border px-4 py-3 text-left transition',
              selectedOrderId === t.orderId
                ? 'border-brand bg-brand/5'
                : 'border-line-strong bg-white hover:border-brand/50',
            )}
          >
            <span className="flex items-center justify-between">
              <span className="font-semibold text-ink">{t.tableName}</span>
              <span className="font-semibold text-ink">{formatVND(t.total)}</span>
            </span>
            <span className="text-xs text-muted">{t.itemCount} món</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Write the public API**

Create `src/widgets/cashier-table-list/index.ts`:

```ts
export { CashierTableList } from './CashierTableList'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bunx vitest run src/widgets/cashier-table-list/CashierTableList.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/widgets/cashier-table-list/
git commit -m "feat(cashier): table list widget with empty state"
```

---

## Task 5: `CashierBillPanel` widget (bill + discount + payment)

**Files:**
- Create: `src/widgets/cashier-bill-panel/CashierBillPanel.tsx`
- Create: `src/widgets/cashier-bill-panel/CashierBillPanel.test.tsx`
- Create: `src/widgets/cashier-bill-panel/index.ts`

**Interfaces:**
- Consumes: `BillDetail`, `DiscountType`, `PaymentMethod` (Task 3), `formatVND`, `Button`/`Input` from `@/shared/ui`.
- Produces: `CashierBillPanel({ bill, busy, onApplyDiscount, onPay }: { bill: BillDetail | null; busy: boolean; onApplyDiscount: (input: { type: DiscountType; value: number; reason: string }) => void; onPay: (method: PaymentMethod) => void })`.

- [ ] **Step 1: Write the failing test**

Create `src/widgets/cashier-bill-panel/CashierBillPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CashierBillPanel } from './CashierBillPanel'
import type { BillDetail } from '@/entities/cashier'

const bill: BillDetail = {
  orderId: 'o1',
  status: 'OPEN',
  subtotal: 190000,
  discountAmount: 10000,
  discountReason: 'Khách quen',
  total: 180000,
  openedAt: '2026-07-04T10:00:00Z',
  items: [
    {
      id: 'i1',
      nameSnapshot: 'Phở bò',
      unitPrice: 90000,
      quantity: 2,
      note: null,
      status: 'SERVED',
      options: [],
    },
  ],
}

describe('CashierBillPanel', () => {
  it('prompts to pick a table when no bill is selected', () => {
    render(
      <CashierBillPanel bill={null} busy={false} onApplyDiscount={() => {}} onPay={() => {}} />,
    )
    expect(screen.getByText('Chọn một bàn để xem hóa đơn')).toBeInTheDocument()
  })

  it('renders line items and totals', () => {
    render(
      <CashierBillPanel bill={bill} busy={false} onApplyDiscount={() => {}} onPay={() => {}} />,
    )
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText('180.000đ')).toBeInTheDocument()
  })

  it('submits a discount', () => {
    const onApplyDiscount = vi.fn()
    render(
      <CashierBillPanel
        bill={bill}
        busy={false}
        onApplyDiscount={onApplyDiscount}
        onPay={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Giá trị giảm'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'VIP' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng giảm giá' }))
    expect(onApplyDiscount).toHaveBeenCalledWith({ type: 'PERCENT', value: 10, reason: 'VIP' })
  })

  it('pays with the selected method', () => {
    const onPay = vi.fn()
    render(
      <CashierBillPanel bill={bill} busy={false} onApplyDiscount={() => {}} onPay={onPay} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }))
    expect(onPay).toHaveBeenCalledWith('CASH')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/widgets/cashier-bill-panel/CashierBillPanel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the widget**

Create `src/widgets/cashier-bill-panel/CashierBillPanel.tsx`:

```tsx
import { useState } from 'react'
import { formatVND } from '@/shared/lib/format'
import { Button, Input } from '@/shared/ui'
import type { BillDetail, DiscountType, PaymentMethod } from '@/entities/cashier'

interface Props {
  bill: BillDetail | null
  busy: boolean
  onApplyDiscount: (input: { type: DiscountType; value: number; reason: string }) => void
  onPay: (method: PaymentMethod) => void
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'TRANSFER', label: 'Chuyển khoản' },
  { value: 'CARD', label: 'Thẻ' },
]

export function CashierBillPanel({ bill, busy, onApplyDiscount, onPay }: Props) {
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT')
  const [discountValue, setDiscountValue] = useState('')
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')

  if (!bill) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Chọn một bàn để xem hóa đơn
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <ul className="flex flex-col gap-2">
        {bill.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-ink">
              {item.nameSnapshot} <span className="text-muted">×{item.quantity}</span>
              {item.options.length > 0 && (
                <span className="block text-xs text-muted">
                  {item.options.map((o) => o.optionName).join(', ')}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap font-medium text-ink">
              {formatVND(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Tạm tính</dt>
          <dd className="font-medium text-ink">{formatVND(bill.subtotal)}</dd>
        </div>
        {bill.discountAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Giảm giá{bill.discountReason ? ` (${bill.discountReason})` : ''}</dt>
            <dd className="font-medium text-ink">−{formatVND(bill.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-base">
          <dt className="font-semibold text-ink">Tổng</dt>
          <dd className="font-bold text-brand">{formatVND(bill.total)}</dd>
        </div>
      </dl>

      <fieldset className="flex flex-col gap-2 border-t border-line pt-3">
        <legend className="mb-1 text-sm font-semibold text-ink-soft">Giảm giá / phụ thu</legend>
        <div className="flex gap-2">
          <select
            aria-label="Loại giảm giá"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as DiscountType)}
            className="h-11 rounded-lg border border-line-strong bg-white px-3 text-sm"
          >
            <option value="PERCENT">%</option>
            <option value="FIXED">VNĐ</option>
          </select>
          <Input
            type="number"
            aria-label="Giá trị giảm"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="0"
          />
        </div>
        <Input
          type="text"
          aria-label="Lý do"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy || discountValue === ''}
          onClick={() =>
            onApplyDiscount({ type: discountType, value: Number(discountValue), reason })
          }
        >
          Áp dụng giảm giá
        </Button>
      </fieldset>

      <fieldset className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
        <legend className="mb-1 text-sm font-semibold text-ink-soft">Thanh toán</legend>
        <select
          aria-label="Phương thức thanh toán"
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className="h-11 rounded-lg border border-line-strong bg-white px-3 text-sm"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <Button type="button" fullWidth size="lg" disabled={busy} onClick={() => onPay(method)}>
          Thanh toán
        </Button>
      </fieldset>
    </div>
  )
}
```

- [ ] **Step 4: Write the public API**

Create `src/widgets/cashier-bill-panel/index.ts`:

```ts
export { CashierBillPanel } from './CashierBillPanel'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bunx vitest run src/widgets/cashier-bill-panel/CashierBillPanel.test.tsx`
Expected: PASS (4 tests).

> If `Button` has no `variant="secondary"`, check `src/shared/ui` for the actual prop and use it; the test only asserts the button label, not its variant.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/cashier-bill-panel/
git commit -m "feat(cashier): bill panel with discount form and payment action"
```

---

## Task 6: `InvoiceReceipt` widget (printable)

**Files:**
- Create: `src/widgets/invoice-receipt/InvoiceReceipt.tsx`
- Create: `src/widgets/invoice-receipt/InvoiceReceipt.test.tsx`
- Create: `src/widgets/invoice-receipt/index.ts`

**Interfaces:**
- Consumes: `BillDetail`, `PaymentMethod` (Task 3), `formatVND`, `Button`.
- Produces: `InvoiceReceipt({ bill, tableName, method, onClose }: { bill: BillDetail; tableName: string; method: PaymentMethod; onClose: () => void })`.

- [ ] **Step 1: Write the failing test**

Create `src/widgets/invoice-receipt/InvoiceReceipt.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InvoiceReceipt } from './InvoiceReceipt'
import type { BillDetail } from '@/entities/cashier'

const bill: BillDetail = {
  orderId: 'o1',
  status: 'PAID',
  subtotal: 190000,
  discountAmount: 10000,
  discountReason: 'VIP',
  total: 180000,
  openedAt: '2026-07-04T10:00:00Z',
  items: [
    { id: 'i1', nameSnapshot: 'Phở bò', unitPrice: 90000, quantity: 2, note: null, status: 'SERVED', options: [] },
  ],
}

describe('InvoiceReceipt', () => {
  it('shows totals and calls window.print', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<InvoiceReceipt bill={bill} tableName="Bàn 5" method="CASH" onClose={() => {}} />)
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
    expect(screen.getByText('180.000đ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'In hóa đơn' }))
    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
  })

  it('calls onClose when dismissed', () => {
    const onClose = vi.fn()
    render(<InvoiceReceipt bill={bill} tableName="Bàn 5" method="CASH" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/widgets/invoice-receipt/InvoiceReceipt.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the widget**

Create `src/widgets/invoice-receipt/InvoiceReceipt.tsx`:

```tsx
import { formatVND } from '@/shared/lib/format'
import { Button } from '@/shared/ui'
import type { BillDetail, PaymentMethod } from '@/entities/cashier'

interface Props {
  bill: BillDetail
  tableName: string
  method: PaymentMethod
  onClose: () => void
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
}

export function InvoiceReceipt({ bill, tableName, method, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-card">
        <div id="invoice-print" className="flex flex-col gap-3">
          <header className="text-center">
            <h2 className="text-lg font-bold text-ink">Hóa đơn</h2>
            <p className="text-sm text-muted">{tableName}</p>
          </header>
          <ul className="flex flex-col gap-1 border-y border-line py-2 text-sm">
            {bill.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span className="text-ink">
                  {item.nameSnapshot} ×{item.quantity}
                </span>
                <span className="text-ink">{formatVND(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Tạm tính</dt>
              <dd className="text-ink">{formatVND(bill.subtotal)}</dd>
            </div>
            {bill.discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Giảm giá</dt>
                <dd className="text-ink">−{formatVND(bill.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <dt className="text-ink">Tổng</dt>
              <dd className="text-brand">{formatVND(bill.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Thanh toán</dt>
              <dd className="text-ink">{METHOD_LABEL[method]}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Đóng
          </Button>
          <Button type="button" fullWidth onClick={() => window.print()}>
            In hóa đơn
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write the public API**

Create `src/widgets/invoice-receipt/index.ts`:

```ts
export { InvoiceReceipt } from './InvoiceReceipt'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bunx vitest run src/widgets/invoice-receipt/InvoiceReceipt.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/widgets/invoice-receipt/
git commit -m "feat(cashier): printable invoice receipt widget"
```

---

## Task 7: `CashierScreenPage` (master-detail composition + data flow)

**Files:**
- Create: `src/pages/cashier-screen/CashierScreenPage.tsx`
- Create: `src/pages/cashier-screen/index.ts`

**Interfaces:**
- Consumes: `useOpenTables` (Task 3); `getBillDetail`, `applyOrderDiscount`, `payOrder` (Task 2); `CashierTableList` (Task 4); `CashierBillPanel` (Task 5); `InvoiceReceipt` (Task 6); `StaffUser` from `@/entities/staff`.
- Produces: `CashierScreenPage({ user, onLogout }: { user: StaffUser; onLogout: () => void })`.

- [ ] **Step 1: Write the page**

Create `src/pages/cashier-screen/CashierScreenPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { getBillDetail, applyOrderDiscount, payOrder } from '@/shared/api/cashier'
import { useOpenTables } from '@/entities/cashier'
import type { BillDetail, DiscountType, PaymentMethod } from '@/entities/cashier'
import type { StaffUser } from '@/entities/staff'
import { CashierTableList } from '@/widgets/cashier-table-list'
import { CashierBillPanel } from '@/widgets/cashier-bill-panel'
import { InvoiceReceipt } from '@/widgets/invoice-receipt'
import { Button } from '@/shared/ui'

interface Props {
  user: StaffUser
  onLogout: () => void
}

interface PaidInvoice {
  bill: BillDetail
  tableName: string
  method: PaymentMethod
}

export function CashierScreenPage({ user, onLogout }: Props) {
  const { tables, refetch } = useOpenTables(user.restaurantId)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [bill, setBill] = useState<BillDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState<PaidInvoice | null>(null)

  const loadBill = useCallback(async (orderId: string) => {
    try {
      setBill(await getBillDetail({ data: { id: orderId } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được hóa đơn')
    }
  }, [])

  // Refetch the selected bill when the live table list changes (SSE / polling).
  useEffect(() => {
    if (selectedOrderId && tables.some((t) => t.orderId === selectedOrderId)) {
      void loadBill(selectedOrderId)
    }
  }, [tables, selectedOrderId, loadBill])

  function selectTable(orderId: string) {
    setError(null)
    setSelectedOrderId(orderId)
    setBill(null)
    void loadBill(orderId)
  }

  async function handleDiscount(input: { type: DiscountType; value: number; reason: string }) {
    if (!selectedOrderId) return
    setBusy(true)
    setError(null)
    try {
      await applyOrderDiscount({ data: { id: selectedOrderId, ...input } })
      await loadBill(selectedOrderId)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không áp dụng được giảm giá')
    } finally {
      setBusy(false)
    }
  }

  async function handlePay(method: PaymentMethod) {
    if (!selectedOrderId || !bill) return
    const tableName = tables.find((t) => t.orderId === selectedOrderId)?.tableName ?? ''
    setBusy(true)
    setError(null)
    try {
      await payOrder({ data: { id: selectedOrderId, method } })
      setPaid({ bill, tableName, method })
      setSelectedOrderId(null)
      setBill(null)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thanh toán được')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h1 className="text-lg font-bold text-brand">Thu ngân</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{user.name}</span>
          <Button type="button" variant="secondary" size="sm" onClick={onLogout}>
            Đăng xuất
          </Button>
        </div>
      </header>

      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(220px,320px)_1fr]">
        <aside className="min-h-0 overflow-y-auto border-r border-line bg-canvas">
          <CashierTableList
            tables={tables}
            selectedOrderId={selectedOrderId}
            onSelect={selectTable}
          />
        </aside>
        <section className="min-h-0 overflow-y-auto">
          <CashierBillPanel
            bill={bill}
            busy={busy}
            onApplyDiscount={handleDiscount}
            onPay={handlePay}
          />
        </section>
      </div>

      {paid && (
        <InvoiceReceipt
          bill={paid.bill}
          tableName={paid.tableName}
          method={paid.method}
          onClose={() => setPaid(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write the public API**

Create `src/pages/cashier-screen/index.ts`:

```ts
export { CashierScreenPage } from './CashierScreenPage'
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS. (If `Button` lacks `variant`/`size` props, match the signature used in `src/pages/kitchen-screen`.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/cashier-screen/
git commit -m "feat(cashier): master-detail cashier screen page"
```

---

## Task 8: Route guard, shell, login & index route

**Files:**
- Create: `src/routes/cashier.tsx`
- Create: `src/routes/cashier.tsx` guard unit test → `src/routes/cashier.access.test.ts`
- Create: `src/routes/cashier.login.tsx`
- Create: `src/routes/cashier.index.tsx`

**Interfaces:**
- Consumes: `getStaffSession`, `loginStaff`, `logoutStaff` from `@/shared/api/auth`; `StaffUser` from `@/entities/staff`; `StaffLoginPage` from `@/pages/staff-login`; `CashierScreenPage` from `@/pages/cashier-screen`.
- Produces: `resolveCashierAccess(pathname: string, session: StaffUser | null): { allow: true } | { allow: false; redirectTo: '/cashier/login' }`.

- [ ] **Step 1: Write the failing guard test**

Create `src/routes/cashier.access.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveCashierAccess } from './cashier'
import type { StaffUser } from '@/entities/staff'

const cashier: StaffUser = { id: 'u1', email: 'c@x', name: 'Thu', role: 'CASHIER', restaurantId: 'r1' }
const kitchen: StaffUser = { ...cashier, role: 'KITCHEN' }
const admin: StaffUser = { ...cashier, role: 'ADMIN' }

describe('resolveCashierAccess', () => {
  it('always allows the login route', () => {
    expect(resolveCashierAccess('/cashier/login', null)).toEqual({ allow: true })
  })
  it('allows CASHIER and ADMIN into the area', () => {
    expect(resolveCashierAccess('/cashier', cashier)).toEqual({ allow: true })
    expect(resolveCashierAccess('/cashier', admin)).toEqual({ allow: true })
  })
  it('redirects a missing session or a non-cashier role to login', () => {
    expect(resolveCashierAccess('/cashier', null)).toEqual({ allow: false, redirectTo: '/cashier/login' })
    expect(resolveCashierAccess('/cashier', kitchen)).toEqual({ allow: false, redirectTo: '/cashier/login' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/routes/cashier.access.test.ts`
Expected: FAIL — `./cashier` / `resolveCashierAccess` not found.

- [ ] **Step 3: Write the guard shell route**

Create `src/routes/cashier.tsx` (mirrors `src/routes/kitchen.tsx`):

```tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession } from '@/shared/api/auth'

type CashierAccess = { allow: true } | { allow: false; redirectTo: '/cashier/login' }

export function resolveCashierAccess(pathname: string, session: StaffUser | null): CashierAccess {
  if (pathname === '/cashier/login') return { allow: true }
  if (!session || (session.role !== 'CASHIER' && session.role !== 'ADMIN')) {
    return { allow: false, redirectTo: '/cashier/login' }
  }
  return { allow: true }
}

export const Route = createFileRoute('/cashier')({
  beforeLoad: async ({ location }): Promise<{ session: StaffUser | null }> => {
    if (location.pathname === '/cashier/login') return { session: null }
    let session
    try {
      session = await getStaffSession()
    } catch {
      throw redirect({ to: '/cashier/login' })
    }
    const access = resolveCashierAccess(location.pathname, session)
    if (!access.allow) {
      throw redirect({ to: access.redirectTo })
    }
    return { session }
  },
  component: CashierLayout,
})

function CashierLayout() {
  return <Outlet />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/routes/cashier.access.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the login route**

Create `src/routes/cashier.login.tsx` (mirrors `kitchen.login.tsx`):

```tsx
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { StaffLoginPage } from '@/pages/staff-login'
import { getStaffSession, loginStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/cashier/login')({
  beforeLoad: async () => {
    let session = null
    try {
      session = await getStaffSession()
    } catch {
      return
    }
    if (session && (session.role === 'CASHIER' || session.role === 'ADMIN')) {
      throw redirect({ to: '/cashier' })
    }
  },
  component: CashierLogin,
})

function CashierLogin() {
  const navigate = useNavigate()
  return (
    <StaffLoginPage
      onSubmit={async (email, password) => {
        await loginStaff({ data: { email, password } })
        await navigate({ to: '/cashier' })
      }}
    />
  )
}
```

- [ ] **Step 6: Write the index route**

Create `src/routes/cashier.index.tsx` (mirrors `kitchen.index.tsx`):

```tsx
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CashierScreenPage } from '@/pages/cashier-screen'
import type { StaffUser } from '@/entities/staff'
import { logoutStaff } from '@/shared/api/auth'

export const Route = createFileRoute('/cashier/')({
  loader: ({ context }): { user: StaffUser } => {
    if (!context.session) throw redirect({ to: '/cashier/login' })
    return { user: context.session }
  },
  component: CashierIndex,
})

function CashierIndex() {
  const { user } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <CashierScreenPage
      user={user}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/cashier/login' })
      }}
    />
  )
}
```

- [ ] **Step 7: Regenerate the route tree + typecheck**

Run: `bun run dev` briefly (TanStack regenerates `src/routeTree.gen.ts` on start) OR `bun run build`, then stop. Then:
Run: `bun run typecheck`
Expected: PASS, and `src/routeTree.gen.ts` now contains `/cashier`, `/cashier/login`, `/cashier/`.

- [ ] **Step 8: Commit**

```bash
git add src/routes/cashier.tsx src/routes/cashier.access.test.ts src/routes/cashier.login.tsx src/routes/cashier.index.tsx src/routeTree.gen.ts
git commit -m "feat(cashier): guarded /cashier route tree with login and index"
```

---

## Task 9: Full validation + lint

**Files:** none (verification task).

- [ ] **Step 1: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 2: Lint (incl. FSD layer rules)**

Run: `bun run lint`
Expected: PASS — no `fsd/*` violations (types come from `shared`, cross-slice imports go through `index.ts`).

- [ ] **Step 3: Full unit suite**

Run: `bun run test:unit`
Expected: PASS, including all new cashier tests.

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A
git commit -m "chore(cashier): satisfy typecheck, lint, and FSD rules" || echo "nothing to commit"
```

---

## Task 10: E2E smoke test

**Files:**
- Create: `e2e/cashier.spec.ts`

**Interfaces:**
- Consumes: the running app + seeded BE. Reuse the login selectors and any cashier test credentials/patterns from `e2e/kitchen.spec.ts` and `e2e/menu-admin.spec.ts`.

- [ ] **Step 1: Read the existing e2e login helper**

Read `e2e/kitchen.spec.ts` and `e2e/menu-admin.spec.ts` to copy the exact login flow, base URL, and any seeded credentials. Determine the cashier account (a `CASHIER` or `ADMIN` user seeded in the BE). If no cashier user is seeded, use the admin credentials the other specs use (admin is allowed into `/cashier`).

- [ ] **Step 2: Write the smoke test**

Create `e2e/cashier.spec.ts` — adapt the login block to match the existing specs' selectors:

```ts
import { test, expect } from '@playwright/test'

// Adjust credentials to whatever kitchen.spec.ts / menu-admin.spec.ts use.
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@demo.test'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin-password'

test('cashier can log in and see the tables screen', async ({ page }) => {
  await page.goto('/cashier/login')
  await page.getByPlaceholder('admin@gmail.com').fill(EMAIL)
  await page.getByPlaceholder(/Nhập mật khẩu/).fill(PASSWORD)
  await page.getByRole('button', { name: /Đăng nhập/ }).click()

  await expect(page.getByRole('heading', { name: 'Thu ngân' })).toBeVisible()
  // Either at least one open table, or the empty state — both prove the screen loaded.
  await expect(
    page.locator('text=Chưa có bàn nào mở').or(page.getByText('món').first()),
  ).toBeVisible()
})
```

- [ ] **Step 3: Run the e2e test**

Run: `bun run test:e2e -- cashier`
Expected: PASS. (Playwright starts the dev server via its config; ensure the BE on :3000 is running and seeded, as the other e2e specs require.)

> If the login selectors differ from what `kitchen.spec.ts` uses, match that spec exactly — it is the source of truth for the working login flow.

- [ ] **Step 4: Commit**

```bash
git add e2e/cashier.spec.ts
git commit -m "test(cashier): e2e smoke for login + tables screen"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- US-5.1 (open tables + totals) → Tasks 3, 4, 7. "Bill requested" badge explicitly deferred (spec §10).
- US-5.2 (bill detail) → Tasks 2, 5, 7.
- US-5.3 (discount %/fixed + reason) → Tasks 2, 5, 7.
- US-5.4 (payment method + close + invoice preview/print) → Tasks 2, 5, 6, 7.
- Realtime (SSE + polling fallback) → Task 3.
- Routing/auth mirror `/kitchen` → Task 8.
- Error handling (401 redirect, toast on failure, empty state, SSE fallback) → guard (Task 8), page error state (Task 7), empty state (Task 4), hook fallback (Task 3).
- Testing (normalize unit, guard unit, widget tests, e2e) → Tasks 1, 4, 5, 6, 8, 10.

**Placeholder scan:** No TBD/TODO; every code step contains full code. The only conditional notes ("if `Button` lacks a prop", "match kitchen.spec login selectors") are verification fallbacks pointing at concrete source files, not deferred work.

**Type consistency:** `CashierTable`/`BillDetail` fields are identical across normalize (Task 1), server API (Task 2), hook (Task 3), and widgets (Tasks 4–6). Server-fn call shape `{ data: {...} }` is consistent (`getBillDetail({ data: { id } })`, `applyOrderDiscount({ data: { id, type, value, reason } })`, `payOrder({ data: { id, method } })`). `resolveCashierAccess` signature matches its test.

**Assumptions to verify during execution (low risk):**
- `Button` prop names (`variant`, `size`, `fullWidth`) — confirm against `src/shared/ui` / `src/pages/kitchen-screen`; adjust if different.
- `GET /api/cashier/orders/{id}` returns the order under `data` with an `id` field and `items[]` shaped like the QR order response — `normalizeBillDetail` handles both `id` and `orderId` defensively.
- Seeded cashier/admin credentials for e2e — read from existing specs.
