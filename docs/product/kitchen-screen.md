# Product: Kitchen Screen (Staff)

Derived from SPEC EPIC 4. Defines the staff-facing kitchen display (KDS) contract.

## Behavior

A kitchen staff member with role `KITCHEN` or `ADMIN` logs in at `/kitchen/login`,
then views a three-column board at `/kitchen`:

- **Chờ làm** — `PENDING` items, oldest first.
- **Đang làm** — `COOKING` items.
- **Đã xong** — recently `SERVED` items (last ~30 minutes from BE).

Each card shows table name, dish name, quantity, note, and selected options. The
board updates in realtime via staff SSE (`order_item.updated`) with polling fallback.

Staff can advance item status (`PENDING → COOKING → SERVED`) and open a **Hết món**
panel to mark menu items temporarily unavailable (hidden from the customer menu).

## Auth (thin slice, EPIC 8 overlap)

- Login: `POST /api/auth/login` via server functions; tokens stored in httpOnly cookies.
- Session: `GET /api/auth/me`; refresh-on-401 in `authedFetch`.
- Logout: `POST /api/auth/logout` + cookie clear.
- Route guard: `/kitchen/*` requires `KITCHEN` or `ADMIN`; unauthenticated users redirect to
  `/kitchen/login`.

## Source of truth

- `GET /api/kitchen/queue` → `{ data: { items: QueueItem[] } }`
- `GET /api/kitchen/served-recent` → `{ data: { items: ServedItem[] } }`
- `PATCH /api/kitchen/order-items/:id/status` → `{ status: 'COOKING' | 'SERVED' }`
- `GET /api/kitchen/menu-items` → menu list for sold-out panel
- `PATCH /api/kitchen/menu-items/:id/availability` → `{ isAvailable: boolean }`
- Staff SSE: `/api/stream/restaurant/:restaurantId` (proxied through FE with Bearer injection)

## Frontend contract

- Routes: `/kitchen`, `/kitchen/login` (TanStack Start).
- Server functions in `shared/api/kitchen.server.ts`, `shared/api/auth.ts`; browser never
  calls the BE directly.
- FSD layers: `pages/kitchen-screen`, `pages/staff-login`, `widgets/kitchen-board`,
  `widgets/sold-out-panel`, `entities/kitchen`, `entities/staff`, `shared/lib/staff-auth.server.ts`.
- Graceful degradation: `fetchServed` returns `[]` on error until BE endpoint is available.
