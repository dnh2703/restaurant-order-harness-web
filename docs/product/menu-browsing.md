# Product: Menu Browsing (Customer)

Derived from SPEC EPIC 2. Defines the customer-facing menu contract.

## Behavior

A customer who opens a valid table URL (`/t/<qrToken>`) sees the restaurant
name, table name, and the menu grouped by category. Each dish shows name,
description, price (VND), and image. Unavailable dishes are shown dimmed with a
"Hết hàng" (sold out) label.

## Source of truth

- Backend: `GET /api/qr/{qrToken}` → `{ restaurant, table, session }`
- Backend: `GET /api/qr/{qrToken}/menu` → `{ categories: [{ id, name, items: [...] }] }`
- An invalid/expired token returns 404 → the UI shows an "Invalid table" screen.

## Frontend contract

- Route `/t/$qrToken` (TanStack Start) loads both endpoints via `createServerFn`
  (server-side proxy; the browser never calls the BE directly).
- Money fields are normalized to integers and formatted as VND.
- Implemented in FSD layers: `pages/customer-menu`, `widgets/top-nav`,
  `widgets/menu-grid`, `widgets/cart-panel`, `entities/menu`, `entities/table`,
  `entities/cart`, `shared/api/qr`, `shared/api/order`, `shared/lib/diacritics`.

## Search / filtering (US-2.2)

Client-side only — no extra BE call. URL search params `?q=` (name search) and
`?cat=` (category filter) persist filter state. Filtering is diacritic-insensitive
via `shared/lib/diacritics`. Implemented in `entities/menu/filter` and surfaced
through `widgets/top-nav` (search input) and `widgets/menu-grid` (category chips).

## Cart & ordering (US-3.1, US-3.2)

Cart state is client-side (`entities/cart/model`). Add/remove/qty-stepper actions
update the live subtotal in `widgets/cart-panel`. Submitting ("Gửi bếp") calls
`POST /api/qr/{qrToken}/order-items` via `shared/api/order`; on success the cart
clears and a confirmation is shown. Multiple submit rounds are supported within
the same `OPEN` session.

## Not yet covered

- Dish detail + option selection (US-2.3).
- Order status tracking (US-3.3).
- Call staff / request bill (US-3.4).
- Realtime availability and status updates (EPIC 9).
