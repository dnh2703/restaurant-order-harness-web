# Customer Order Tracking + Realtime — Design

**Date:** 2026-06-29
**Branch:** `feat/customer-order-tracking`
**Phase:** Phase 2, slice 1 of 3 (tracking + realtime; options/notes is a later slice)

## Goal

After a customer submits an order from the QR menu, give them a dedicated page to
watch their order's per-item status progress live (`PENDING → COOKING → SERVED`,
or `CANCELLED`), backed by SSE with a polling fallback.

## Backend (already available)

- `GET /api/qr/:qrToken/order` — returns `orderView`:
  - order: `status` (`OPEN | PAID | CANCELLED`), `subtotal`, `discountAmount`, `total`, `openedAt`
  - `items[]`: `id`, `menuItemId`, `nameSnapshot`, `unitPrice`, `quantity`, `note`,
    `status` (`PENDING | COOKING | SERVED | CANCELLED`), `createdAt`,
    `options[]` (`optionName`, `priceDelta`)
- `GET /api/qr/:qrToken/stream` — SSE of `order_item.updated` events
  (`{ orderItemId, orderId, status }`), plus `keep-alive` comments.
  BE recommendation: on SSE failure, poll the order endpoint every 2–3s.

All monetary fields are integers in đồng.

## Architecture & data flow

```
Browser ──EventSource──▶ /api/qr/:token/stream (Start API route, SSE proxy) ──▶ BE :3000 /api/qr/:token/stream
   │                                                                              (order_item.updated)
   └──getOrder() server-fn──▶ BE GET /api/qr/:token/order  (initial load + poll fallback)
```

- **Initial load + poll fallback:** server-fn `getOrder(qrToken)` proxies the BE order
  endpoint. The FE keeps talking to the BE through the existing server-fn proxy pattern
  (no direct browser → :3000 call for data fetches).
- **Live:** the browser opens `EventSource('/api/qr/<token>/stream')`. Because the FE
  proxies the BE (it does not call :3000 directly), we add a TanStack Start API route
  that streams-through the BE SSE response.
- **On `order_item.updated`:** refetch the whole order (simple and robust — also picks up
  new items and updated totals) rather than patching individual items in place.
- **On SSE `onerror`:** close the stream, switch to polling `getOrder` every 2.5s, and
  attempt SSE reconnect with backoff. When SSE reconnects, stop polling.

## Components

| Location | Responsibility |
|----------|----------------|
| `src/routes/t.$qrToken.order.tsx` | Child route → renders `CustomerOrderPage` |
| `src/routes/api/qr.$qrToken.stream.ts` | Start API route: proxy/stream-through BE SSE |
| `src/shared/api/order.ts` | Add `getOrder` server-fn (maps đồng integers) |
| `src/entities/order/` | Order/item types + status metadata (VI label, color, Phosphor icon, progress order) |
| `src/entities/order/useOrderStream.ts` | Hook returning `{ order, mode: 'live' \| 'polling' \| 'error', refetch }` — encapsulates SSE + poll fallback + reconnect |
| `src/widgets/order-tracker/` | Header (order status + connection indicator), item list (status chip + progress), totals footer, "Gọi thêm món" link |
| `src/widgets/top-nav/TopNav.tsx` | Add "Đơn của bạn" link → `/t/:token/order` |
| `src/widgets/cart-panel/CartPanel.tsx` | On successful submit, navigate to `/t/:token/order` |

### `useOrderStream` boundary

- **Input:** `qrToken`.
- **Output:** `{ order, mode, refetch }` where `mode` is `'live'` (SSE connected),
  `'polling'` (fallback active), or `'error'` (initial load failed).
- **Depends on:** `getOrder` server-fn, browser `EventSource`.
- Owns all transport concerns; the page/widgets only consume `order` + `mode`.

## UI states

- **Loading:** list skeleton.
- **Empty** (order `OPEN`, no items yet, or no order): "Chưa có món nào" + link to menu.
- **Loaded:** each item shows a colored status chip
  (PENDING gray / COOKING orange / SERVED green / CANCELLED struck-through),
  plus subtotal / discount / total footer.
- **Error:** message + retry button.
- **Connection indicator:** small dot — "Đang cập nhật trực tiếp" (SSE) vs "Đang đồng bộ…" (polling).

## Decisions

- **A.** After a successful submit, auto-navigate to `/t/:token/order` (not just a toast).
- **B.** SSE `order_item.updated` triggers a full order refetch (not in-place item patch).
- **C.** E2E asserts up to the `PENDING` state only — it does not drive a kitchen status change in this slice.

## Testing

- **Unit (vitest + RTL):**
  - `CustomerOrderPage` renders loaded statuses, empty, and error states.
  - `useOrderStream` falls back to polling when `EventSource` errors (mock `EventSource`).
- **E2E (playwright, seeded token):** submit an order → visit `/order` → see items in
  `PENDING`; assert the connection indicator is shown.

## Out of scope (later slices)

- Menu item options/modifiers (SINGLE/MULTI, required, priceDelta) and per-item notes
  at the menu/cart layer.
- Driving kitchen-side status transitions from the FE.
