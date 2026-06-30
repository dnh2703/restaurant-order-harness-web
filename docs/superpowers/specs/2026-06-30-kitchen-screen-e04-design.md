# Design — EPIC 4: Kitchen Screen (E04)

Date: 2026-06-30
Status: approved-pending-review
Repos touched: `restaurant-order-harness-web` (FE), `restaurant-order-harness-server` (BE)

## 1. Goal & scope

Build the staff-facing Kitchen Display (KDS) for EPIC 4:

- **US-4.1** — view the realtime make-queue of `PENDING`/`COOKING` items (table, qty,
  note, options), oldest first.
- **US-4.2** — advance a dish `PENDING → COOKING → SERVED`; updates push in realtime.
- **US-4.3** — mark a dish temporarily sold out (hides it from the customer menu).

All `/api/kitchen/*` endpoints and the staff SSE stream require staff auth (verified:
they return `401 UNAUTHORIZED` without a token). The FE currently has **no auth layer**.
So E04 also brings a **thin slice of EPIC 8** — only enough login to unlock the kitchen
screen. Full RBAC for Cashier/Admin and staff-account management (US-8.4) are out of scope.

### In scope
- Thin staff auth: login page, httpOnly-cookie token storage, refresh-on-401, logout,
  route guard limited to roles `KITCHEN` and `ADMIN`.
- Kitchen board: 3 columns `Chờ làm` / `Đang làm` / `Đã xong`, realtime via staff SSE
  with polling fallback.
- Sold-out panel on the kitchen screen (US-4.3).
- **New BE endpoint** `GET /api/kitchen/served-recent` + a `served_at` column on
  `order_items`, so the `Đã xong` column is durable across reloads.

### Out of scope
- Cashier and Admin screens, staff-account management (US-8.4), menu administration (EPIC 6).
- Customer-facing changes.

## 2. Decisions (locked)

| Decision | Choice |
| --- | --- |
| Auth scope | Thin slice — login + KITCHEN/ADMIN guard only |
| Token storage | httpOnly cookies, set/read server-side; calls + SSE proxied through FE server |
| Kitchen layout | 3-column board per wireframe (`Chờ làm` / `Đang làm` / `Đã xong`) |
| US-4.3 sold-out | A "Hết món" panel on the kitchen screen (SPEC puts US-4.3 under Kitchen) |
| `Đã xong` column | Durable, backed by a new BE endpoint (not session-only) |
| BE work | Implemented in this effort (separate branch/PR in the BE repo) |
| `Bắt đầu` action | Added to `Chờ làm` cards (wireframe omits it but US-4.2 needs PENDING→COOKING) |
| Elapsed timer | Kept, with color escalation when an item waits too long |

## 3. Backend changes (`restaurant-order-harness-server`)

Conventions to follow (verified): Clean Architecture (domain / application / infrastructure /
presentation), `{ data }` success envelope, `{ error: { code, message } }` errors, Elysia
`t` (TypeBox) schemas, Drizzle ORM on Postgres, Bun test runner (`bun test`), auth via the
`authGuard` macro + `.guard({ auth: ['KITCHEN','ADMIN'] })` which exposes
`auth.restaurantId`.

### 3.1 Schema: `served_at` on `order_items`
`order_items` currently has only a `status` enum and `createdAt` (order time). There is no
serve timestamp, so "recently served, newest first" cannot be expressed.

- Add nullable column `servedAt timestamp({ withTimezone: true })` to `order_items` in
  `src/infrastructure/database/schema.ts`.
- Add a Drizzle migration for the new column.
- In `advanceItemStatus`, when the target status is `SERVED`, set `servedAt = now()` in the
  same conditional `UPDATE`. (Other transitions leave it untouched.)
- Add an index supporting the served-recent query, e.g. on `(status, servedAt)`.

### 3.2 Endpoint: `GET /api/kitchen/served-recent`
- Mounted in `src/presentation/http/routes/kitchen.ts`, guarded `{ auth: ['KITCHEN','ADMIN'] }`.
- Service `src/application/kitchen/get-served-recent.ts`, mirroring `get-queue.ts`:
  join `order_items → orders → tables`, filter `orders.restaurantId = auth.restaurantId`
  AND `order_items.status = 'SERVED'` AND `servedAt >= now() - interval '30 minutes'`,
  order by `servedAt DESC, id`, `LIMIT 50`; stitch options in a second query like the queue does.
- Response: `{ data: { items: ServedItem[] } }` where `ServedItem` mirrors the queue item
  shape — `{ id, tableName, nameSnapshot, quantity, note, options[] }` — plus
  `servedAt: string` (ISO) and `status: 'SERVED'`.
- TypeBox response schema added next to the existing `queueItem` schema.

### 3.3 Tests (BE)
Mirror `test/kitchen/kitchen-routes.integration.test.ts` and `kitchen-queue.integration.test.ts`:
- served-recent returns SERVED items newest-first, scoped to the caller's restaurant,
  excludes items served > 30 min ago, respects the limit.
- 401 without token, 403 for a `CASHIER` token.
- `advanceItemStatus` sets `servedAt` when transitioning to SERVED and leaves it null otherwise.

## 4. Frontend changes (`restaurant-order-harness-web`)

Follows FSD layers and the existing server-fn proxy + SSE-proxy patterns.

### 4.1 Thin staff auth
- `src/entities/staff/model.ts` — `StaffUser { id, email, name, role, restaurantId }`,
  `StaffRole = 'ADMIN' | 'KITCHEN' | 'CASHIER'`.
- `src/shared/lib/staff-auth.server.ts` (server-only):
  - cookie helpers to set/read/clear `accessToken` + `refreshToken` as httpOnly cookies
    (using TanStack Start cookie utilities; `secure` in production, `sameSite=lax`).
  - `withStaffAuth(call)` — runs an authed fetch with the `Bearer` access token; on `401`
    it calls `POST /api/auth/refresh` once with the refresh cookie, updates cookies, and
    retries. If refresh fails, it clears cookies and throws an `Unauthenticated` signal.
- `src/shared/api/auth.ts` — server-fns:
  - `loginStaff({ email, password })` → `POST /api/auth/login`, sets cookies, returns the
    `StaffUser` (no tokens to the client).
  - `getStaffSession()` → reads cookie, calls `GET /api/auth/me` (refresh-on-401), returns
    `StaffUser | null`.
  - `logoutStaff()` → `POST /api/auth/logout`, clears cookies.

### 4.2 Routes & guard
- `src/routes/kitchen.login.tsx` → `StaffLoginPage`.
- `src/routes/kitchen.tsx` — layout with `beforeLoad`: call `getStaffSession()`; if null or
  role ∉ `{KITCHEN, ADMIN}` → `redirect` to `/kitchen/login`. Provides the `StaffUser`
  (incl. `restaurantId`) to children.
- `src/routes/kitchen.index.tsx` → `KitchenScreenPage`.
- `src/routes/api/stream.restaurant.ts` — SSE proxy route mirroring
  `api/qr.$qrToken.stream.ts`: read the access-token cookie, fetch
  `GET /api/stream/restaurant/{restaurantId}` upstream with the `Bearer` header, and pipe the
  `text/event-stream` body back to the browser.

### 4.3 Kitchen data + realtime
- `src/shared/api/kitchen.ts` — server-fns, each wrapped in `withStaffAuth`:
  - `fetchKitchenQueue()` → `GET /api/kitchen/queue`.
  - `fetchServedRecent()` → `GET /api/kitchen/served-recent`.
  - `advanceOrderItemStatus({ id, status })` → `PATCH /api/kitchen/order-items/{id}/status`.
  - `listMenuItemsForKitchen()` → `GET /api/menu-items/` (for the sold-out panel).
  - `setMenuItemAvailability({ id, isAvailable })` →
    `PATCH /api/kitchen/menu-items/{id}/availability`.
- `src/entities/kitchen/model.ts` — `KitchenQueueItem`, `ServedItem` types + a `normalize`
  that coerces `quantity` to a number (BE schema marks it integer, but normalize defensively)
  and maps options to `{ optionName, priceDelta }`.
- `src/entities/kitchen/useKitchenStream.ts` — mirrors `useOrderStream`: opens an
  `EventSource` on `/api/stream/restaurant` (the FE proxy route); on **any** message/named
  event it refetches the queue and served-recent (simple and robust regardless of the exact
  event name). On error it falls back to polling every 2.5s and reconnects every 5s. Exposes a
  `connection` status (`live` | `polling`).

### 4.4 UI
- `src/pages/staff-login/StaffLoginPage.tsx` — email + password form (reuses `shared/ui`
  `Input`, `Button`), error message on invalid credentials, redirects to `/kitchen` on success.
- `src/pages/kitchen-screen/KitchenScreenPage.tsx` — wires `useKitchenStream`, holds the
  served-recent list, renders header + board + sold-out drawer.
- `src/widgets/kitchen-board/KitchenBoard.tsx` — 3 columns: **`Chờ làm (n)`** (PENDING),
  **`Đang làm (n)`** (COOKING), **`Đã xong`** (served-recent). Empty states per column.
- `src/widgets/kitchen-board/KitchenCard.tsx` — shows table name, elapsed time from
  `createdAt` (color escalates orange/red past thresholds), `tên món × qty`, note, options
  (`+optionName`). Actions:
  - PENDING card: **`Bắt đầu`** → advance to `COOKING`.
  - COOKING card: **`Xong →`** → advance to `SERVED` (card moves to `Đã xong`).
  - Served card: read-only with a check mark.
  - Updates are **optimistic** with rollback + a toast on failure.
- `src/widgets/sold-out-panel/SoldOutPanel.tsx` — a `shared/ui/Drawer` opened from a
  header **`Hết món`** button; lists menu items with an availability toggle calling
  `setMenuItemAvailability`. Optimistic with rollback.
- Header: title **`Màn hình bếp`**, `Hết món` button, connection indicator (live/polling),
  and a logout button.

### 4.5 Tests (FE)
- Unit: `normalize` (quantity/options), guard redirect logic, `KitchenBoard` renders the
  three columns with correct counts, `KitchenCard` actions invoke the right server-fn (mocked),
  optimistic rollback on failure.
- Component: `KitchenScreenPage` with `useKitchenStream` and the kitchen server-fns mocked —
  advancing a PENDING item moves it across columns.
- e2e (Playwright, `e2e/kitchen.spec.ts`): log in with `E2E_KITCHEN_EMAIL` /
  `E2E_KITCHEN_PASSWORD` (seeded `kitchen@demo.test` / `kitchen-password`), see the queue, and
  advance an item. `test.skip` when the env vars are unset (same pattern as `E2E_QR_TOKEN`).

## 5. Error handling & edge cases
- Empty columns → friendly empty state.
- SSE drops → automatic polling fallback; header shows the degraded state.
- Access token expired → `withStaffAuth` refreshes once; refresh failure clears cookies and
  the guard bounces to `/kitchen/login`.
- 403 (wrong role) on any call → treat as unauthenticated for the kitchen surface; redirect to login.
- Advance race (item already advanced elsewhere) → BE returns NOT_FOUND/INVALID_TRANSITION;
  FE rolls back the optimistic move and refetches.
- `served-recent` empty after a fresh deploy is expected (only items served in the last 30 min).

## 6. Data flow summary
1. Staff logs in → FE server-fn stores tokens in httpOnly cookies.
2. `/kitchen` guard validates the session server-side (refresh if needed) and gates on role.
3. Page loads queue + served-recent via authed server-fns; opens the SSE proxy stream.
4. Any SSE event → refetch queue + served-recent (polling fallback if the stream is down).
5. `Bắt đầu` / `Xong →` PATCH the item status (optimistic); SERVED stamps `servedAt` on the BE
   and the item appears in `Đã xong`.
6. `Hết món` toggles menu-item availability, immediately hiding the dish from the customer menu.

## 7. Sequencing
1. **BE first** — `served_at` column + migration, `advanceItemStatus` stamps it,
   `GET /api/kitchen/served-recent`, tests. Merge (no squash).
2. **FE auth slice** — entities, cookie helpers, auth server-fns, login page, `/kitchen` guard.
3. **FE kitchen** — kitchen server-fns, SSE proxy + hook, board/card/sold-out UI, page wiring.
4. **Tests** — unit + component + e2e; verify against the seeded BE.

Each repo gets its own branch and PR; the FE depends on the BE endpoint being available
(merged or running locally) for its e2e to pass.
