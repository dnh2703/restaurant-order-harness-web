# E05 — Cashier & Payment (FE slice) — Design

**Date:** 2026-07-04
**Epic:** E05 (SPEC.md §2) — US-5.1, US-5.2, US-5.3, US-5.4
**Status:** Approved design, pre-implementation

## 1. Goal

Give the cashier a screen to close out the order lifecycle: view open tables with
running totals, open a table's bill, apply discounts/surcharges, take payment, and
close the session. This completes the end-to-end flow (order → cook → **pay** →
close).

## 2. Decisions (locked)

- **Scope:** full flow US-5.1 → US-5.4. The "bill requested" badge (part of
  US-5.1 AC) and call-staff (US-3.4) are **deferred** — the BE has no
  `service_requests` endpoint yet.
- **Layout:** master-detail on a single screen (table list left, bill + discount +
  payment right). Suited to a counter/wide screen.
- **Realtime:** reuse the existing staff SSE stream
  `GET /api/stream/restaurant/{id}` (route proxy already exists), with polling
  fallback — mirror `entities/order/useOrderStream`.
- **Invoice:** client-side print via `window.print()` on a receipt view. No BE
  invoice endpoint required.

## 3. Backend surface (already available)

Verified against BE Swagger (`/api/docs/json`, BE on :3000):

| Endpoint | Shape |
| --- | --- |
| `GET /api/cashier/tables` | `{ data: { tables: { orderId, tableId, tableName, subtotal, discountAmount, total, openedAt, itemCount }[] } }` |
| `GET /api/cashier/orders/{id}` | Bill detail — order + items (same structure as `/api/qr/{qrToken}/order-items`: `{ id, status, subtotal, discountAmount, total, openedAt, items: { id, menuItemId, nameSnapshot, unitPrice, quantity, note, status, options: { optionName, priceDelta }[] }[] }`) |
| `PATCH /api/cashier/orders/{id}/discount` | body `{ type: 'PERCENT' \| 'FIXED', value, reason }` |
| `POST /api/cashier/orders/{id}/payment` | body `{ method: 'CASH' \| 'TRANSFER' \| 'CARD' }` |
| `GET /api/stream/restaurant/{id}` | staff SSE (already proxied by `src/routes/api/stream.restaurant.$id.ts`) |

Money fields arrive as strings in several BE responses (same as `sortOrder`
elsewhere) → normalize to `number` on the FE.

`StaffUser` already carries `restaurantId` (`src/shared/api/types/staff.ts`), so
the SSE stream URL is `/api/stream/restaurant/${session.restaurantId}`.

## 4. Routing & auth (mirror `/kitchen`)

Follows the existing `/kitchen` shell pattern (`src/routes/kitchen.tsx`), including
the 401-redirect / single-auth-round-trip behavior from PR #11.

| File | Role |
| --- | --- |
| `src/routes/cashier.tsx` | Guard shell. `resolveCashierAccess(pathname, session)` allows `CASHIER` + `ADMIN`; otherwise redirect `/cashier/login`. `beforeLoad` fetches the session once and passes it to children via context. |
| `src/routes/cashier.login.tsx` | Reuse the existing staff-login component (`src/pages/staff-login`); on success redirect to `/cashier`. |
| `src/routes/cashier.index.tsx` | Loader reuses `context.session`; renders `CashierScreenPage`. |

The login page component is generalized to accept a redirect target/role so both
`/kitchen/login` and `/cashier/login` reuse it (no logic duplication). Keep
`resolveCashierAccess` as its own pure, unit-tested function alongside the route.

## 5. FSD components

**Page** — `src/pages/cashier-screen/CashierScreenPage.tsx`
- Two-column master-detail layout. Holds `selectedOrderId` state. Top-nav + logout
  (mirror `KitchenScreenPage`).

**Widgets**
- `src/widgets/cashier-table-list` — left column. Open tables (name, total,
  itemCount, openedAt), selectable rows, live via SSE. Empty state when no open
  tables.
- `src/widgets/cashier-bill-panel` — right column. Line items (unit price ×
  quantity = line total, with chosen options), subtotal / discount / total.
  Contains the discount editor and the payment action.
  - Discount editor: `type` (PERCENT | FIXED) + `value` + `reason` → `applyDiscount`.
  - Payment: method picker (CASH | TRANSFER | CARD) → `takePayment`.
- `src/widgets/invoice-receipt` — printable receipt view (items, subtotal,
  discount, total, method, table, timestamp) + `window.print()`.

If the bill panel grows large, split the discount editor into its own
`widgets/discount-form`; otherwise keep it inline.

**Entity** — `src/entities/cashier`
- Types: `CashierTable`, `BillDetail` (reuse `entities/order` item/option types
  where they already fit).
- `useRestaurantStream(restaurantId)` — SSE consumption of
  `/api/stream/restaurant/$id` with polling fallback; mirror `useOrderStream`
  (close previous `EventSource` before reopening; degrade to polling on error).

## 6. API layer (server-fn proxy — pattern from `shared/api/kitchen.ts`)

- `src/shared/api/cashier.server.ts` — raw `fetch` to BE via `cookieTokenStore`
  (`@/shared/lib/staff-auth.server`): `fetchOpenTables()`, `fetchBillDetail(id)`,
  `applyDiscount(id, { type, value, reason })`, `takePayment(id, { method })`.
- `src/shared/api/cashier.ts` — `createServerFn` wrappers (GET/POST) with
  validators.
- `src/shared/api/cashier-normalize.ts` — normalize money strings → numbers for
  tables and bill detail. Display via `formatVND` (`src/shared/lib/format.ts`).

## 7. Data flow

```
login (/cashier/login) → /cashier
  → cashier.index loader: fetchOpenTables
  → client subscribes SSE /api/stream/restaurant/${restaurantId}
       on event → invalidate open tables + current bill
select table → fetchBillDetail(orderId) → right panel
apply discount → PATCH discount → refetch bill (subtotal/total update)
pay → pick CASH/TRANSFER/CARD → POST payment
  → order PAID, table leaves the list → show invoice-receipt → print
```

## 8. Error handling

- 401 → redirect `/cashier/login` (reuse PR #11 pattern; no refresh-token
  rotation storm).
- Invalid discount (e.g. value > subtotal) or payment failure → toast error, keep
  panel state intact.
- No open tables → empty state "Chưa có bàn nào mở".
- SSE failure/unsupported → polling fallback (2–3s), same as `useOrderStream`.

## 9. Testing

- **Unit:** `cashier-normalize` (string → number), `resolveCashierAccess` (role
  gating), discount/total display math.
- **Widget** (mock server-fns): table-list selection, bill-panel totals, discount
  form submit, payment flow reaching the invoice.
- **E2E** `e2e/cashier.spec.ts`: login as cashier → see open tables → open a bill →
  apply discount → pay → invoice appears. Mirror `e2e/menu-admin.spec.ts` /
  `e2e/kitchen.spec.ts`.

## 10. Out of scope (deferred)

- "Bill requested" badge & call-staff / request-bill (US-3.4) — needs BE
  `service_requests`.
- Staff account management (US-8.4).
- Multi-restaurant handling.
