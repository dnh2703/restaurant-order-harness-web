# Kitchen Redesign + Optimistic Status Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make kitchen status changes feel instant (optimistic UI with rollback + toast) and restyle the kitchen display to the "Culinary Flow" layout with a sidebar shell and draggable cards.

**Architecture:** `useKitchenStream` stays the raw SSE/polling transport. A new `useKitchenQueue` hook wraps it and layers an optimistic override map so cards change column immediately, reverting on API error and reconciling when the server catches up. `KitchenBoard` gets a `@dnd-kit/core` drag layer (buttons kept). `sonner` provides success/error toasts. A new `side-nav` widget provides the left shell.

**Tech Stack:** React 19, TanStack Start/Router, Tailwind (design tokens), `@dnd-kit/core`, `sonner`, Vitest + Testing Library, Bun.

## Global Constraints

- **Package manager: Bun only.** Install with `bun add`; never npm/yarn/pnpm (repo has a bun-only guard hook).
- **FSD boundaries:** cross-layer imports only through a slice's public `index.ts`; no cross-slice imports within a layer; no UI imports inside business logic. Verify with `bun run lint:fsd`.
- **Vietnamese copy** for all kitchen-facing UI strings.
- **Design tokens only** — use existing tokens (`brand` `#2563eb`, `ink`, `muted`, `secondary`, `line`, `line-strong`, `page`, `rounded-control`, `rounded-button`); do not hardcode mockup hex values.
- **Forward-only transitions:** allowed moves are `PENDING→COOKING` and `COOKING→SERVED` only. No backward moves; no new backend/API contract.
- **New deps:** `@dnd-kit/core`, `sonner`.
- Validation commands: `bun run typecheck`, `bun run test`, `bun run lint:fsd`. E2E `bun run test:e2e` must stay green (unchanged login/redirect flow).

---

### Task 1: Add dependencies + Toaster re-export

**Files:**
- Modify: `package.json` (via `bun add`)
- Create: `src/shared/ui/Toast.ts`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**
- Produces: `Toaster` (component) and `toast` (imperative API) re-exported from `@/shared/ui`.

- [ ] **Step 1: Install dependencies**

Run:
```bash
bun add @dnd-kit/core sonner
```
Expected: `package.json` gains `@dnd-kit/core` and `sonner` under dependencies; `bun.lock` updates.

- [ ] **Step 2: Create the Toast re-export**

Create `src/shared/ui/Toast.ts`:
```ts
// sonner ships its own styles inline — no extra CSS import needed.
export { Toaster, toast } from 'sonner'
```

- [ ] **Step 3: Export it from the UI barrel**

In `src/shared/ui/index.ts`, add at the end:
```ts
export { Toaster, toast } from './Toast'
```

- [ ] **Step 4: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock src/shared/ui/Toast.ts src/shared/ui/index.ts
git commit -m "chore(web): add @dnd-kit/core + sonner; re-export Toaster/toast"
```

---

### Task 2: `resolveDrop` transition helper (pure, TDD)

**Files:**
- Create: `src/entities/kitchen/resolveDrop.ts`
- Test: `src/entities/kitchen/resolveDrop.test.ts`
- Modify: `src/entities/kitchen/index.ts`

**Interfaces:**
- Consumes: `KitchenStatus` from `./model` (`'PENDING' | 'COOKING'`).
- Produces: `type BoardColumn = 'PENDING' | 'COOKING' | 'SERVED'` and
  `resolveDrop(from: KitchenStatus, target: BoardColumn): 'COOKING' | 'SERVED' | null`.

- [ ] **Step 1: Write the failing test**

Create `src/entities/kitchen/resolveDrop.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveDrop } from './resolveDrop'

describe('resolveDrop', () => {
  it('PENDING dropped on Đang làm advances to COOKING', () => {
    expect(resolveDrop('PENDING', 'COOKING')).toBe('COOKING')
  })
  it('COOKING dropped on Đã xong advances to SERVED', () => {
    expect(resolveDrop('COOKING', 'SERVED')).toBe('SERVED')
  })
  it('no-ops when dropped on the same column', () => {
    expect(resolveDrop('PENDING', 'PENDING')).toBeNull()
    expect(resolveDrop('COOKING', 'COOKING')).toBeNull()
  })
  it('rejects skipping a step (PENDING → SERVED)', () => {
    expect(resolveDrop('PENDING', 'SERVED')).toBeNull()
  })
  it('rejects backward moves (COOKING → PENDING)', () => {
    expect(resolveDrop('COOKING', 'PENDING')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/entities/kitchen/resolveDrop.test.ts`
Expected: FAIL — cannot find module `./resolveDrop`.

- [ ] **Step 3: Write the implementation**

Create `src/entities/kitchen/resolveDrop.ts`:
```ts
import type { KitchenStatus } from './model'

export type BoardColumn = 'PENDING' | 'COOKING' | 'SERVED'

/**
 * Forward-only, single-step transitions for drag-and-drop.
 * Returns the target status to advance to, or null for a no-op.
 */
export function resolveDrop(from: KitchenStatus, target: BoardColumn): 'COOKING' | 'SERVED' | null {
  if (from === 'PENDING' && target === 'COOKING') return 'COOKING'
  if (from === 'COOKING' && target === 'SERVED') return 'SERVED'
  return null
}
```

- [ ] **Step 4: Export from the entity barrel**

In `src/entities/kitchen/index.ts`, add:
```ts
export { resolveDrop, type BoardColumn } from './resolveDrop'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- src/entities/kitchen/resolveDrop.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/entities/kitchen/resolveDrop.ts src/entities/kitchen/resolveDrop.test.ts src/entities/kitchen/index.ts
git commit -m "feat(web): add forward-only resolveDrop transition helper"
```

---

### Task 3: `useKitchenQueue` optimistic hook (TDD)

**Files:**
- Create: `src/entities/kitchen/useKitchenQueue.ts`
- Test: `src/entities/kitchen/useKitchenQueue.test.ts`
- Modify: `src/entities/kitchen/index.ts`

**Interfaces:**
- Consumes: `useKitchenStream` and `StreamMode` from `./useKitchenStream`; `advanceOrderItemStatus` from `@/shared/api/kitchen`; `KitchenQueueItem`, `ServedItem` from `./model`.
- Produces:
  ```ts
  function useKitchenQueue(restaurantId: string): {
    pending: KitchenQueueItem[]
    cooking: KitchenQueueItem[]
    served: ServedItem[]
    mode: StreamMode
    advance: (id: string, status: 'COOKING' | 'SERVED') => Promise<void> // rejects on API failure
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `src/entities/kitchen/useKitchenQueue.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { KitchenQueueItem, ServedItem } from './model'

vi.mock('./useKitchenStream', () => ({ useKitchenStream: vi.fn() }))
vi.mock('@/shared/api/kitchen', () => ({ advanceOrderItemStatus: vi.fn() }))

import { useKitchenStream } from './useKitchenStream'
import { advanceOrderItemStatus } from '@/shared/api/kitchen'
import { useKitchenQueue } from './useKitchenQueue'

const p1: KitchenQueueItem = {
  id: 'p1', tableName: 'Bàn 1', nameSnapshot: 'Phở', quantity: 1,
  note: null, status: 'PENDING', createdAt: 't', options: [],
}
const c1: KitchenQueueItem = { ...p1, id: 'c1', status: 'COOKING' }

function mockStream(queue: KitchenQueueItem[], served: ServedItem[] = []) {
  vi.mocked(useKitchenStream).mockReturnValue({
    queue, served, mode: 'live', refetch: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(advanceOrderItemStatus).mockResolvedValue(undefined)
})

describe('useKitchenQueue', () => {
  it('moves a card to the next column immediately on advance', async () => {
    mockStream([p1])
    const { result } = renderHook(() => useKitchenQueue('r1'))
    expect(result.current.pending).toHaveLength(1)
    expect(result.current.cooking).toHaveLength(0)

    await act(async () => {
      await result.current.advance('p1', 'COOKING')
    })

    expect(result.current.pending).toHaveLength(0)
    expect(result.current.cooking).toHaveLength(1)
    expect(advanceOrderItemStatus).toHaveBeenCalledWith({ data: { id: 'p1', status: 'COOKING' } })
  })

  it('optimistically moves a cooking card to served', async () => {
    mockStream([c1])
    const { result } = renderHook(() => useKitchenQueue('r1'))
    await act(async () => {
      await result.current.advance('c1', 'SERVED')
    })
    expect(result.current.cooking).toHaveLength(0)
    expect(result.current.served.map((s) => s.id)).toContain('c1')
  })

  it('rolls back and rejects when the API fails', async () => {
    mockStream([p1])
    vi.mocked(advanceOrderItemStatus).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useKitchenQueue('r1'))

    await act(async () => {
      await expect(result.current.advance('p1', 'COOKING')).rejects.toThrow('boom')
    })

    expect(result.current.pending).toHaveLength(1)
    expect(result.current.cooking).toHaveLength(0)
  })

  it('prunes the override once the server reflects the new status', async () => {
    mockStream([p1])
    const { result, rerender } = renderHook(() => useKitchenQueue('r1'))
    await act(async () => {
      await result.current.advance('p1', 'COOKING')
    })
    expect(result.current.cooking).toHaveLength(1)

    // Server catches up: p1 is now COOKING.
    mockStream([{ ...p1, status: 'COOKING' }])
    rerender()

    await waitFor(() => expect(result.current.cooking).toHaveLength(1))
    // No duplicate; override pruned, still exactly one cooking card.
    expect(result.current.cooking).toHaveLength(1)
  })

  it('dedupes optimistic served against the server served list by id', async () => {
    const served: ServedItem = {
      id: 'c1', tableName: 'Bàn 1', nameSnapshot: 'Phở', quantity: 1,
      note: null, options: [], servedAt: 't',
    }
    mockStream([c1])
    const { result, rerender } = renderHook(() => useKitchenQueue('r1'))
    await act(async () => {
      await result.current.advance('c1', 'SERVED')
    })
    // Server catches up: c1 left the queue and appears in served.
    mockStream([], [served])
    rerender()
    await waitFor(() =>
      expect(result.current.served.filter((s) => s.id === 'c1')).toHaveLength(1),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/entities/kitchen/useKitchenQueue.test.ts`
Expected: FAIL — cannot find module `./useKitchenQueue`.

- [ ] **Step 3: Write the implementation**

Create `src/entities/kitchen/useKitchenQueue.ts`:
```ts
import { useCallback, useEffect, useMemo, useState } from 'react'
import { advanceOrderItemStatus } from '@/shared/api/kitchen'
import { useKitchenStream, type StreamMode } from './useKitchenStream'
import type { KitchenQueueItem, ServedItem } from './model'

type AdvanceStatus = 'COOKING' | 'SERVED'
interface Override {
  status: AdvanceStatus
  at: string
}

export function useKitchenQueue(restaurantId: string): {
  pending: KitchenQueueItem[]
  cooking: KitchenQueueItem[]
  served: ServedItem[]
  mode: StreamMode
  advance: (id: string, status: AdvanceStatus) => Promise<void>
} {
  const { queue, served: servedServer, mode, refetch } = useKitchenStream(restaurantId)
  const [overrides, setOverrides] = useState<Record<string, Override>>({})

  // Drop overrides the server has already caught up to. Prevents flicker and
  // stops overrides from lingering once the stream reflects the new state.
  useEffect(() => {
    setOverrides((prev) => {
      const ids = Object.keys(prev)
      if (ids.length === 0) return prev
      const next = { ...prev }
      let changed = false
      for (const id of ids) {
        const qItem = queue.find((i) => i.id === id)
        if (prev[id]!.status === 'COOKING') {
          if (!qItem || qItem.status === 'COOKING') {
            delete next[id]
            changed = true
          }
        } else if (servedServer.some((s) => s.id === id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [queue, servedServer])

  const { pending, cooking, served } = useMemo(() => {
    const pending: KitchenQueueItem[] = []
    const cooking: KitchenQueueItem[] = []
    const optimisticServed: ServedItem[] = []
    for (const item of queue) {
      const ov = overrides[item.id]
      if (ov?.status === 'SERVED') {
        optimisticServed.push({
          id: item.id,
          tableName: item.tableName,
          nameSnapshot: item.nameSnapshot,
          quantity: item.quantity,
          note: item.note,
          options: item.options,
          servedAt: ov.at,
        })
      } else if (ov?.status === 'COOKING' || item.status === 'COOKING') {
        cooking.push({ ...item, status: 'COOKING' })
      } else {
        pending.push(item)
      }
    }
    const serverIds = new Set(servedServer.map((s) => s.id))
    const merged = [...servedServer, ...optimisticServed.filter((o) => !serverIds.has(o.id))]
    return { pending, cooking, served: merged }
  }, [queue, servedServer, overrides])

  const advance = useCallback(
    async (id: string, status: AdvanceStatus) => {
      const at = new Date().toISOString()
      setOverrides((prev) => ({ ...prev, [id]: { status, at } }))
      try {
        await advanceOrderItemStatus({ data: { id, status } })
        refetch()
      } catch (e) {
        setOverrides((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        throw e
      }
    },
    [refetch],
  )

  return { pending, cooking, served, mode, advance }
}
```

- [ ] **Step 4: Export from the entity barrel**

In `src/entities/kitchen/index.ts`, add:
```ts
export { useKitchenQueue } from './useKitchenQueue'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- src/entities/kitchen/useKitchenQueue.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/entities/kitchen/useKitchenQueue.ts src/entities/kitchen/useKitchenQueue.test.ts src/entities/kitchen/index.ts
git commit -m "feat(web): add useKitchenQueue optimistic advance hook"
```

---

### Task 4: Restyle `KitchenCard` (presentational, TDD)

`KitchenCard` stays a pure presentational component (no drag logic — that lives in the board). This task only restyles it and renames the cooking action to "Hoàn thành".

**Files:**
- Modify: `src/widgets/kitchen-board/KitchenCard.tsx`
- Test: `src/widgets/kitchen-board/KitchenCard.test.tsx`

**Interfaces:**
- Consumes: `KitchenQueueItem`, `ServedItem` from `@/entities/kitchen`; `Button` from `@/shared/ui`; `cn` from `@/shared/lib/cn`; `ClockIcon`, `CheckCircleIcon` from `@phosphor-icons/react`.
- Produces: unchanged prop shape — `{ item, onAdvance }` (queue) or `{ item, served: true }`.

- [ ] **Step 1: Update the test for the new copy**

In `src/widgets/kitchen-board/KitchenCard.test.tsx`, replace the third test with:
```ts
  it('a cooking card calls onAdvance with SERVED via "Hoàn thành"', () => {
    const onAdvance = vi.fn()
    render(<KitchenCard item={{ ...pending, status: 'COOKING' }} onAdvance={onAdvance} />)
    fireEvent.click(screen.getByRole('button', { name: /Hoàn thành/ }))
    expect(onAdvance).toHaveBeenCalledWith('oi1', 'SERVED')
  })
```
Add a fourth test after it:
```ts
  it('renders a served card as completed with elapsed minutes', () => {
    render(
      <KitchenCard
        item={{
          id: 's1', tableName: 'Bàn 9', nameSnapshot: 'Gỏi', quantity: 2,
          note: null, options: [], servedAt: new Date(Date.now() - 2 * 60000).toISOString(),
        }}
        served
      />,
    )
    expect(screen.getByText('Bàn 9')).toBeInTheDocument()
    expect(screen.getByText(/2 phút trước/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/widgets/kitchen-board/KitchenCard.test.tsx`
Expected: FAIL — no button named "Hoàn thành"; no "2 phút trước" text.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/widgets/kitchen-board/KitchenCard.tsx`:
```tsx
import { ClockIcon, CheckCircleIcon } from '@phosphor-icons/react'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

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
    <article
      className={cn(
        'rounded-control border bg-white p-3',
        isServed ? 'border-line opacity-70' : 'border-line-strong shadow-sm',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-brand">Tại bàn</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold',
            isServed ? 'text-green-700' : elapsedClass(minutes),
          )}
        >
          {isServed ? <CheckCircleIcon size={14} weight="fill" /> : <ClockIcon size={14} weight="bold" />}
          {isServed ? `${minutes} phút trước` : `${minutes}′`}
        </span>
      </div>

      <p className={cn('mt-0.5 font-bold text-ink', isServed && 'line-through')}>{item.tableName}</p>
      <p className={cn('mt-1 text-sm text-ink', isServed && 'text-muted line-through')}>
        {item.nameSnapshot} <span className="font-semibold">× {item.quantity}</span>
      </p>
      {item.options.length > 0 && (
        <p className="text-xs text-secondary">
          {item.options.map((o) => `+${o.optionName}`).join(', ')}
        </p>
      )}
      {item.note && <p className="text-xs italic text-secondary">"{item.note}"</p>}

      {!isServed && (
        <div className="mt-2">
          {(item as KitchenQueueItem).status === 'PENDING' ? (
            <Button
              size="sm"
              fullWidth
              onClick={() => (props as QueueProps).onAdvance(item.id, 'COOKING')}
            >
              Bắt đầu
            </Button>
          ) : (
            <Button
              size="sm"
              fullWidth
              onClick={() => (props as QueueProps).onAdvance(item.id, 'SERVED')}
            >
              Hoàn thành
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/widgets/kitchen-board/KitchenCard.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/kitchen-board/KitchenCard.tsx src/widgets/kitchen-board/KitchenCard.test.tsx
git commit -m "feat(web): restyle KitchenCard, rename cooking action to Hoàn thành"
```

---

### Task 5: `KitchenBoard` with drag-and-drop + column props (TDD)

Board changes from receiving `(queue, served)` to receiving pre-split `(pending, cooking, served)` and gains a `@dnd-kit/core` drag layer.

**Files:**
- Modify: `src/widgets/kitchen-board/KitchenBoard.tsx`
- Test: `src/widgets/kitchen-board/KitchenBoard.test.tsx`

**Interfaces:**
- Consumes: `KitchenQueueItem`, `ServedItem`, `resolveDrop`, `BoardColumn` from `@/entities/kitchen`; `KitchenCard` from `./KitchenCard`; `cn` from `@/shared/lib/cn`; `ForkKnifeIcon`, `CookingPotIcon`, `CheckCircleIcon` from `@phosphor-icons/react`; DnD primitives from `@dnd-kit/core`.
- Produces:
  ```ts
  interface Props {
    pending: KitchenQueueItem[]
    cooking: KitchenQueueItem[]
    served: ServedItem[]
    onAdvance: (id: string, status: 'COOKING' | 'SERVED') => void
  }
  ```

- [ ] **Step 1: Rewrite the test for the new props**

Replace the entire contents of `src/widgets/kitchen-board/KitchenBoard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { KitchenBoard } from './KitchenBoard'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen'

const base = {
  tableName: 'Bàn 1',
  nameSnapshot: 'Phở',
  quantity: 1,
  note: null,
  options: [],
  createdAt: 't',
}
const pending: KitchenQueueItem[] = [
  { ...base, id: 'p1', status: 'PENDING' },
  { ...base, id: 'p2', status: 'PENDING' },
]
const cooking: KitchenQueueItem[] = [{ ...base, id: 'c1', status: 'COOKING' }]
const served: ServedItem[] = [
  { id: 's1', tableName: 'Bàn 4', nameSnapshot: 'Gỏi', quantity: 1, note: null, options: [], servedAt: new Date().toISOString() },
]

describe('KitchenBoard', () => {
  it('renders the three columns with their counts', () => {
    render(<KitchenBoard pending={pending} cooking={cooking} served={served} onAdvance={vi.fn()} />)
    const pendingCol = screen.getByRole('region', { name: /Chờ làm/ })
    const cookingCol = screen.getByRole('region', { name: /Đang làm/ })
    const doneCol = screen.getByRole('region', { name: /Đã xong/ })
    expect(within(pendingCol).getByText('2')).toBeInTheDocument()
    expect(within(cookingCol).getByText('1')).toBeInTheDocument()
    expect(within(doneCol).getByText('Bàn 4')).toBeInTheDocument()
  })

  it('shows an empty state for an empty column', () => {
    render(<KitchenBoard pending={[]} cooking={[]} served={[]} onAdvance={vi.fn()} />)
    expect(screen.getAllByText(/Chưa có món/).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/widgets/kitchen-board/KitchenBoard.test.tsx`
Expected: FAIL — `KitchenBoard` still expects `queue`; no `region` roles / count badges.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/widgets/kitchen-board/KitchenBoard.tsx`:
```tsx
import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ForkKnifeIcon, CookingPotIcon, CheckCircleIcon } from '@phosphor-icons/react'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen'
import { resolveDrop, type BoardColumn } from '@/entities/kitchen'
import { cn } from '@/shared/lib/cn'
import { KitchenCard } from './KitchenCard'

interface Props {
  pending: KitchenQueueItem[]
  cooking: KitchenQueueItem[]
  served: ServedItem[]
  onAdvance: (id: string, status: 'COOKING' | 'SERVED') => void
}

function DraggableCard({
  item,
  onAdvance,
}: {
  item: KitchenQueueItem
  onAdvance: Props['onAdvance']
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { status: item.status },
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-50')}
    >
      <KitchenCard item={item} onAdvance={onAdvance} />
    </div>
  )
}

function Column({
  id,
  title,
  icon,
  count,
  accent,
  children,
}: {
  id: BoardColumn
  title: string
  icon: ReactNode
  count: number
  accent: string
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-line bg-page/60 p-3',
        accent,
        isOver && 'ring-2 ring-brand/40',
      )}
    >
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className="text-brand">{icon}</span>
        {title}
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-secondary">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="text-xs text-muted">Chưa có món</p>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </section>
  )
}

export function KitchenBoard({ pending, cooking, served, onAdvance }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function onDragEnd(event: DragEndEvent) {
    if (!event.over) return
    const from = event.active.data.current?.status as KitchenQueueItem['status'] | undefined
    if (!from) return
    const next = resolveDrop(from, event.over.id as BoardColumn)
    if (next) onAdvance(String(event.active.id), next)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <Column
          id="PENDING"
          title="Chờ làm"
          icon={<ForkKnifeIcon size={18} weight="bold" />}
          count={pending.length}
          accent="border-t-2 border-t-line-strong"
        >
          {pending.map((item) => (
            <DraggableCard key={item.id} item={item} onAdvance={onAdvance} />
          ))}
        </Column>

        <Column
          id="COOKING"
          title="Đang làm"
          icon={<CookingPotIcon size={18} weight="bold" />}
          count={cooking.length}
          accent="border-t-2 border-t-brand"
        >
          {cooking.map((item) => (
            <DraggableCard key={item.id} item={item} onAdvance={onAdvance} />
          ))}
        </Column>

        <Column
          id="SERVED"
          title="Đã xong"
          icon={<CheckCircleIcon size={18} weight="bold" />}
          count={served.length}
          accent="border-t-2 border-t-green-500/60"
        >
          {served.map((item) => (
            <KitchenCard key={item.id} item={item} served />
          ))}
        </Column>
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/widgets/kitchen-board/KitchenBoard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/kitchen-board/KitchenBoard.tsx src/widgets/kitchen-board/KitchenBoard.test.tsx
git commit -m "feat(web): kitchen board with dnd-kit drag layer and column props"
```

---

### Task 6: `side-nav` widget (TDD)

**Files:**
- Create: `src/widgets/side-nav/SideNav.tsx`
- Create: `src/widgets/side-nav/index.ts`
- Test: `src/widgets/side-nav/SideNav.test.tsx`

**Interfaces:**
- Consumes: `StaffRole` from `@/entities/staff`; `Button` from `@/shared/ui`; `cn` from `@/shared/lib/cn`; `ChefHatIcon`, `CookingPotIcon`, `SignOutIcon` from `@phosphor-icons/react`.
- Produces:
  ```ts
  interface Props {
    userName: string
    userRole: StaffRole
    onLogout: () => void
  }
  export function SideNav(props: Props): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

Create `src/widgets/side-nav/SideNav.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SideNav } from './SideNav'

describe('SideNav', () => {
  it('shows the single Bếp tab, the user, and a working logout', () => {
    const onLogout = vi.fn()
    render(<SideNav userName="Đầu Bếp" userRole="KITCHEN" onLogout={onLogout} />)

    expect(screen.getByRole('link', { name: /Bếp/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Đầu Bếp')).toBeInTheDocument()
    expect(screen.getByText('Nhân viên bếp')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/ }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/widgets/side-nav/SideNav.test.tsx`
Expected: FAIL — cannot find module `./SideNav`.

- [ ] **Step 3: Write the component**

Create `src/widgets/side-nav/SideNav.tsx`:
```tsx
import { ChefHatIcon, CookingPotIcon, SignOutIcon } from '@phosphor-icons/react'
import type { StaffRole } from '@/entities/staff'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface Props {
  userName: string
  userRole: StaffRole
  onLogout: () => void
}

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: 'Quản trị',
  KITCHEN: 'Nhân viên bếp',
  CASHIER: 'Thu ngân',
}

/** Left shell for the kitchen app. Only the (active) "Bếp" tab exists today. */
export function SideNav({ userName, userRole, onLogout }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-5 md:flex">
      <div className="flex items-center gap-2.5 px-1">
        <div className="flex size-9 items-center justify-center rounded-control bg-brand text-white">
          <ChefHatIcon size={20} weight="fill" />
        </div>
        <span className="text-base font-extrabold tracking-tight text-ink">Nhà bếp</span>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        <a
          href="/kitchen"
          aria-current="page"
          className={cn(
            'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-semibold',
            'bg-brand-bg text-brand',
          )}
        >
          <CookingPotIcon size={18} weight="bold" />
          Bếp
        </a>
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{userName}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABEL[userRole]}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onLogout}
          aria-label="Đăng xuất"
          className="shrink-0"
        >
          <SignOutIcon size={16} weight="bold" />
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Create the public API**

Create `src/widgets/side-nav/index.ts`:
```ts
export { SideNav } from './SideNav'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- src/widgets/side-nav/SideNav.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/widgets/side-nav/
git commit -m "feat(web): add side-nav shell widget with Bếp tab"
```

---

### Task 7: Wire `KitchenScreenPage` — shell, optimistic queue, toasts (TDD)

**Files:**
- Modify: `src/pages/kitchen-screen/KitchenScreenPage.tsx`
- Test: `src/pages/kitchen-screen/KitchenScreenPage.test.tsx`

**Interfaces:**
- Consumes: `useKitchenQueue` from `@/entities/kitchen`; `KitchenBoard` from `@/widgets/kitchen-board`; `SideNav` from `@/widgets/side-nav`; `SoldOutPanel` from `@/widgets/sold-out-panel`; `Toaster`, `toast`, `Badge`, `Button` from `@/shared/ui`; `listMenuItemsForKitchen`, `setMenuItemAvailability` from `@/shared/api/kitchen`.
- Produces: unchanged page props `{ user: StaffUser; onLogout: () => void }`.

- [ ] **Step 1: Rewrite the page test**

Replace the entire contents of `src/pages/kitchen-screen/KitchenScreenPage.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// vi.mock is hoisted above imports, so shared spies must be created with vi.hoisted.
const { advance } = vi.hoisted(() => ({ advance: vi.fn(() => Promise.resolve()) }))

vi.mock('@/entities/kitchen', () => ({
  useKitchenQueue: vi.fn(() => ({
    pending: [
      {
        id: 'p1', tableName: 'Bàn 5', nameSnapshot: 'Phở', quantity: 1,
        note: null, status: 'PENDING', createdAt: new Date().toISOString(), options: [],
      },
    ],
    cooking: [],
    served: [],
    mode: 'live',
    advance,
  })),
}))
vi.mock('@/shared/api/kitchen', () => ({
  listMenuItemsForKitchen: vi.fn(() =>
    Promise.resolve([{ id: 'm1', name: 'Phở bò', isAvailable: true }]),
  ),
  setMenuItemAvailability: vi.fn(() => Promise.resolve()),
}))
vi.mock('@/shared/ui', async (importActual) => {
  const actual = await importActual<typeof import('@/shared/ui')>()
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } }
})

import { KitchenScreenPage } from './KitchenScreenPage'
import { listMenuItemsForKitchen } from '@/shared/api/kitchen'
import { toast } from '@/shared/ui'

const user = {
  id: 'u1', email: 'kitchen@demo.test', name: 'Đầu Bếp',
  role: 'KITCHEN' as const, restaurantId: 'r1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KitchenScreenPage', () => {
  it('renders the header and the pending queue', () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    expect(screen.getByText('Màn hình bếp')).toBeInTheDocument()
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
  })

  it('advancing a pending item calls advance and shows a success toast', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    await waitFor(() => expect(advance).toHaveBeenCalledWith('p1', 'COOKING'))
    await waitFor(() => expect(vi.mocked(toast.success)).toHaveBeenCalled())
  })

  it('opening the sold-out panel loads menu items', async () => {
    render(<KitchenScreenPage user={user} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Hết món/ }))
    await waitFor(() => expect(vi.mocked(listMenuItemsForKitchen)).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/pages/kitchen-screen/KitchenScreenPage.test.tsx`
Expected: FAIL — page still imports `useKitchenStream`/`advanceOrderItemStatus`, no success toast wired.

- [ ] **Step 3: Rewrite the page**

Replace the entire contents of `src/pages/kitchen-screen/KitchenScreenPage.tsx`:
```tsx
import { useCallback, useState } from 'react'
import { KitchenBoard } from '@/widgets/kitchen-board'
import { SideNav } from '@/widgets/side-nav'
import { SoldOutPanel } from '@/widgets/sold-out-panel'
import { useKitchenQueue } from '@/entities/kitchen'
import type { StaffUser } from '@/entities/staff'
import { Badge, Button, Toaster, toast } from '@/shared/ui'
import {
  listMenuItemsForKitchen,
  setMenuItemAvailability,
  type KitchenMenuItem,
} from '@/shared/api/kitchen'

interface Props {
  user: StaffUser
  onLogout: () => void
}

export function KitchenScreenPage({ user, onLogout }: Props) {
  const { pending, cooking, served, mode, advance } = useKitchenQueue(user.restaurantId)
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<KitchenMenuItem[]>([])

  const onAdvance = useCallback(
    async (id: string, status: 'COOKING' | 'SERVED') => {
      try {
        await advance(id, status)
        toast.success('Đã chuyển trạng thái')
      } catch {
        toast.error('Không cập nhật được món, đã hoàn tác')
      }
    },
    [advance],
  )

  const openPanel = useCallback(async () => {
    setPanelOpen(true)
    setMenuItems([])
    try {
      setMenuItems(await listMenuItemsForKitchen())
    } catch {
      toast.error('Không tải được danh sách món.')
    }
  }, [])

  const onToggleAvailability = useCallback(async (id: string, nextIsAvailable: boolean) => {
    setMenuItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isAvailable: nextIsAvailable } : m)),
    )
    try {
      await setMenuItemAvailability({ data: { id, isAvailable: nextIsAvailable } })
    } catch {
      setMenuItems((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isAvailable: !nextIsAvailable } : m)),
      )
      toast.error('Không cập nhật được trạng thái món.')
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-page">
      <SideNav userName={user.name} userRole={user.role} onLogout={onLogout} />

      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Màn hình bếp</h1>
            <p className="text-sm text-muted">Đồng bộ đơn theo thời gian thực.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={mode === 'live' ? 'brand' : 'outline'} dot>
              {mode === 'live' ? 'Trực tiếp' : 'Đang dò'}
            </Badge>
            <Button size="sm" variant="secondary" onClick={openPanel}>
              Hết món
            </Button>
            <Button size="sm" variant="ghost" onClick={onLogout} className="md:hidden">
              Đăng xuất
            </Button>
          </div>
        </header>

        <KitchenBoard pending={pending} cooking={cooking} served={served} onAdvance={onAdvance} />
      </main>

      <SoldOutPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        items={menuItems}
        onToggle={onToggleAvailability}
      />
      <Toaster richColors position="top-center" />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/pages/kitchen-screen/KitchenScreenPage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Full validation sweep**

Run:
```bash
bun run typecheck && bun run test && bun run lint:fsd
```
Expected: typecheck clean; all vitest suites pass; no FSD boundary violations.

- [ ] **Step 6: Commit**

```bash
git add src/pages/kitchen-screen/KitchenScreenPage.tsx src/pages/kitchen-screen/KitchenScreenPage.test.tsx
git commit -m "feat(web): wire kitchen page to optimistic queue, sidebar shell, sonner toasts"
```

---

### Task 8: Manual verification + harness proof + e2e

**Files:** none (verification only)

- [ ] **Step 1: Run the app and eyeball the board**

Run: `bun run dev` (port 3001). Log in at `/kitchen/login` (creds per `e2e/kitchen.spec.ts` env), then at `/kitchen`:
- Tap "Bắt đầu" → card jumps to "Đang làm" immediately, then a success toast appears.
- Drag a "Chờ làm" card onto "Đang làm" → advances; drag a "Đang làm" card onto "Đã xong" → served.
- Confirm sidebar shows only the "Bếp" tab.

- [ ] **Step 2: Simulate an API failure (optional but recommended)**

Temporarily throw inside `advanceOrderItemStatus` (or block the network) and confirm the card snaps back and an error toast shows. Revert the change.

- [ ] **Step 3: Run e2e**

Run: `bun run test:e2e`
Expected: `e2e/kitchen.spec.ts` passes (login/redirect unchanged), or skips cleanly without env creds — do not claim pass if skipped.

- [ ] **Step 4: Update harness proof + trace**

Run:
```bash
scripts/bin/harness-cli story update --id US-4.2 --unit 1 --integration 1 --e2e 0 --platform 0
scripts/bin/harness-cli trace --summary "Kitchen redesign + optimistic transitions (dnd-kit, sonner, side-nav)" --outcome success --story US-4.2
```

- [ ] **Step 5: Push branch and open PR**

```bash
git push -u origin feat/kitchen-redesign-optimistic
gh pr create --fill --base main
```
(Per project convention: merge with a normal merge commit, never squash.)

---

## Self-Review

**Spec coverage:**
- Optimistic transitions → Task 3 (`useKitchenQueue`) + Task 7 (wiring). ✅
- Success toast on API confirm → Task 7 `onAdvance`. ✅
- Error toast + rollback → Task 3 (rollback) + Task 7 (`toast.error`). ✅
- Drag-and-drop, mouse+touch, buttons kept → Task 5 (sensors + `DraggableCard`), buttons retained in Task 4. ✅
- Forward-only → Task 2 (`resolveDrop`). ✅
- Sidebar, only "Bếp" tab → Task 6. ✅
- Restyle with tokens → Tasks 4, 5. ✅
- Vietnamese copy → Tasks 4, 5, 6, 7. ✅
- sonner dependency → Task 1. ✅
- Tests (resolveDrop, useKitchenQueue, components, page; e2e green) → Tasks 2–8. ✅

**Placeholder scan:** No TBD/TODO. The one illustrative import in Task 7 Step 1 is explicitly corrected immediately below it with the real imports to use.

**Type consistency:** `advance(id, status)` and `onAdvance(id, status)` share `'COOKING' | 'SERVED'` everywhere. `BoardColumn` (`'PENDING' | 'COOKING' | 'SERVED'`) is the droppable id type used by both `resolveDrop` and `KitchenBoard`. `useKitchenQueue` returns `{ pending, cooking, served, mode, advance }`, matching the `KitchenBoard` props and the page consumption. `SideNav` props `{ userName, userRole, onLogout }` match the page call.
