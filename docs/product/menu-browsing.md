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
- Implemented in FSD layers: `pages/customer-menu`, `widgets/menu-list`,
  `entities/menu`, `entities/table`, `shared/api`.

## Not yet covered

- Search / diacritic-insensitive filtering (US-2.2).
- Dish detail + option selection (US-2.3).
- Realtime availability updates (EPIC 9).
- Automated tests (unit/integration/e2e) — currently manual verification only.
