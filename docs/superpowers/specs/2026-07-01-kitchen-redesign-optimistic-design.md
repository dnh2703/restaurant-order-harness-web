# Kitchen Redesign + Optimistic Status Transitions — Design

- Date: 2026-07-01
- Intake: #9 (Change request, lane **normal**)
- Stories touched: US-4.1 (kitchen views realtime make-queue), US-4.2 (kitchen advances dish status)
- Branch: `feat/kitchen-redesign-optimistic`

## Problem

Two problems on the kitchen display:

1. **Slow status changes.** `KitchenScreenPage.onAdvance` awaits `advanceOrderItemStatus`
   then calls `refetch()`. The card only moves columns after both the API call and
   the refetch complete, so the kitchen staff taps and waits.
2. **Dated UI.** The board should match the provided "Culinary Flow" mockup layout:
   three-column Kanban with per-column headers/counts, richer cards (order-type badge,
   table name, elapsed timer, item lines), and a left sidebar shell.

## Goals

- Cards change column **immediately** on tap/drag (optimistic), reverting with an error
  toast if the API fails.
- On success, a toast confirms the transition was persisted by the API.
- Cards are draggable between columns (mouse + touch) as an alternative to buttons.
- Restyle to the mockup layout using existing design tokens.
- All kitchen-facing copy in Vietnamese.

## Non-goals (YAGNI)

- No global order search bar, notification bell, settings gear, or avatar from the mockup.
- Sidebar contains **only the existing "Bếp" tab** — no Dashboard/Table Map/Menu/Staff/
  Analytics placeholder routes.
- No backward transitions (SERVED→COOKING→PENDING). The backend `advanceItem` contract
  only moves forward; adding backward moves would be a separate high-risk API change.
- No new backend/API contract changes. Frontend-only.

## Approach

### 1. Optimistic transitions (`entities/kitchen/useKitchenQueue`)

`useKitchenStream` stays as the raw transport (SSE + polling) and keeps owning the
server-derived `queue` / `served` state. A new hook `useKitchenQueue(restaurantId)`
wraps it and layers optimistic state:

- Holds an override map `Map<itemId, 'COOKING' | 'SERVED'>`.
- Derives display state by applying overrides on top of server state:
  - `effectiveStatus(item) = override[item.id] ?? item.status`
  - `pending`  = queue items with effective status `PENDING`
  - `cooking`  = queue items with effective status `COOKING`
  - `served`   = server served items **plus** queue items overridden to `SERVED`,
    synthesized into served-card shape (`servedAt = "now"`), deduped by `id`.
- `advance(id, status)`:
  1. Set override `id → status` (card moves column instantly).
  2. Call `advanceOrderItemStatus({ data: { id, status } })`.
  3. On success: trigger `refetch()`; keep the override until a fresh server load
     confirms it (see reconciliation), then resolve.
  4. On failure: delete the override (card returns to its previous column) and
     **rethrow** so the page can toast the error.
- **Reconciliation:** after every fresh server load (SSE/poll/refetch), prune any
  override that the server state already satisfies or whose item has disappeared.
  This prevents flicker and races between optimism and the stream refetch, and stops
  overrides from lingering.

Rationale for placing this in `entities/kitchen`: the override map must live with the
server state it decorates so the two never desync. Keeping `advance` here also means
buttons and drag share exactly one mutation path.

### 2. Drag-and-drop (`@dnd-kit/core`)

- Add dependency `@dnd-kit/core` (installed via Bun).
- `KitchenBoard` renders a `DndContext` with `PointerSensor`, `TouchSensor`, and
  `KeyboardSensor` (mouse + touch + a11y). Each column is a droppable; each queue card
  is a draggable. Served cards are not draggable.
- Pure helper `resolveDrop(fromStatus, targetColumn): 'COOKING' | 'SERVED' | null`
  enforces forward-only, single-step moves:
  - `PENDING` dropped on "Đang làm" → `'COOKING'`
  - `COOKING` dropped on "Đã xong"  → `'SERVED'`
  - anything else → `null` (no-op)
- `onDragEnd` calls `resolveDrop`; if non-null, calls the same `advance` used by buttons.

### 3. Sidebar shell (`widgets/side-nav`)

- New widget: left sidebar with brand (restaurant name), a single nav item **"Bếp"**
  (active), and a footer with the signed-in user + logout.
- `KitchenScreenPage` arranges a two-pane shell: `side-nav` on the left, board content
  on the right. Responsive: sidebar collapses/stacks on narrow screens.

### 4. Restyle (`widgets/kitchen-board`, `KitchenCard`)

- Columns: header with icon + title + count badge; top accent border per column.
- Cards: "TẠI BÀN" order-type badge, bold table name, elapsed timer with clock icon
  (color via existing `elapsedClass`), item line `name × qty`, options/note, action
  button ("Bắt đầu" / "Hoàn thành"). Served card: strikethrough + "✓ Xong … phút trước".
- All styling uses existing tokens (`brand`, `ink`, `muted`, `line-strong`, etc.) — no
  pixel-copy of mockup hex values.

### 5. Toasts (`sonner`)

- Add dependency `sonner`. Re-export `Toaster` + `toast` through `shared/ui`. Mount a
  single `<Toaster />` in the kitchen shell.
- Success: `toast.success('Đã chuyển trạng thái')` — confirms the API persisted the change.
- Failure: `toast.error('Không cập nhật được món, đã hoàn tác')` (rollback already done
  in the hook).
- Removes the previous inline `<p>` error banner.

### 6. Vietnamese copy

"Màn hình bếp" · "Đồng bộ đơn theo thời gian thực." · column titles "Chờ làm / Đang làm /
Đã xong" · "TẠI BÀN" · "Bắt đầu" · "Hoàn thành" · "ĐÃ XONG" · "… phút trước" · live badge
"Trực tiếp" / "Đang dò" · sidebar "Bếp".

## Data flow

```
tap button / drag card
        |
        v
useKitchenQueue.advance(id, status)   -- set override -> card moves column immediately
        |
        +--> advanceOrderItemStatus (server fn)
                |
                +-- success --> refetch(); prune override on next server load; toast.success
                |
                +-- failure --> delete override (revert); rethrow --> page toast.error

SSE "order_item.updated" / poll --> useKitchenStream.load() --> prune reconciled overrides
```

## Error handling

- API failure on `advance`: override removed → card snaps back; `toast.error`.
- Stream drop: existing `useKitchenStream` fallback to polling / reconnect is unchanged.
- Menu / sold-out load failures: keep existing behavior, surfaced via `toast.error`.

## FSD impact

| Layer | Change |
| --- | --- |
| `shared/ui` | Re-export `Toaster` + `toast` from `sonner` |
| `entities/kitchen` | New `useKitchenQueue` (optimistic + advance); pure `resolveDrop` |
| `widgets/kitchen-board` | `DndContext`, droppable columns, draggable cards, restyle |
| `widgets/side-nav` | New sidebar widget |
| `pages/kitchen-screen` | Compose shell + board + sold-out; wire toasts |

## Testing (lane normal)

- TDD pure logic first:
  - `resolveDrop` — forward-only transition table, including no-op cases.
  - `useKitchenQueue` — card moves column immediately on `advance`; rollback + rethrow on
    API failure; override pruned when a server load confirms/removes the item; dedupe of
    optimistic vs server SERVED by `id`.
- Update component tests: `KitchenBoard`, `KitchenCard`, `KitchenScreenPage` for the new
  structure, buttons, and toast wiring.
- Keep `e2e/kitchen.spec` green (login/redirect flow unchanged).
- DnD gestures are covered via `resolveDrop` unit tests rather than simulated drag.

## Dependencies added

- `@dnd-kit/core`
- `sonner`
