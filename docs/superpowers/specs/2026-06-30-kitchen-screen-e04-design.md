# Design — EPIC 4: Kitchen Screen (E04)

Date: 2026-06-30
Status: approved-pending-review
Repo touched: `restaurant-order-harness-web` (FE only)
BE: not implemented here — a contract is handed to the BE team (see §3 and
`2026-06-30-kitchen-served-recent-BE-contract.md`).

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
- FE coded against a **BE contract** — `GET /api/kitchen/served-recent` plus a `served_at`
  column — that the BE team implements separately, so the `Đã xong` column is durable.

### Out of scope
- **All BE implementation.** The new endpoint is specified as a contract (§3) and handed to
  the BE team; this effort does not modify `restaurant-order-harness-server`.
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
| BE work | **Not done here** — contract handed to the BE team; FE codes against it |
| `Bắt đầu` action | Added to `Chờ làm` cards (wireframe omits it but US-4.2 needs PENDING→COOKING) |
| Elapsed timer | Kept, with color escalation when an item waits too long |

## 3. Backend contract (handed to the BE team — not implemented here)

The FE needs one new endpoint so the `Đã xong` column is durable. This is a **requirement
handed to the BE team**; the full standalone contract lives in
`2026-06-30-kitchen-served-recent-BE-contract.md`. Summary:

- **Schema:** `order_items` has only `status` + `createdAt` (order time) and no serve
  timestamp. Add a `served_at` timestamp, set it when an item transitions to `SERVED`.
- **Endpoint:** `GET /api/kitchen/served-recent`, same auth guard as the other kitchen
  routes (`KITCHEN`/`ADMIN`), scoped to the caller's restaurant. Returns `SERVED` items from
  the last 30 minutes, newest first, limited to ~50.
- **Response:** `{ data: { items: ServedItem[] } }` where `ServedItem` mirrors the queue item
  shape — `{ id, tableName, nameSnapshot, quantity, note, options[] }` — plus
  `servedAt: string` (ISO) and `status: 'SERVED'`.

Until the endpoint ships, the FE degrades gracefully: the `Đã xong` column shows items served
in the current session and the served-recent fetch failure is swallowed (see §5).

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
- **`Đã xong` source with graceful degradation:** the column prefers `fetchServedRecent()`.
  Because the BE endpoint may not exist yet, a failed/404 served-recent fetch is swallowed and
  the column falls back to an in-session list of items this device just marked `SERVED`
  (capped ~20, cleared on reload). When the endpoint ships, no FE change is needed — it simply
  starts returning data.

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
- `served-recent` endpoint not yet deployed → fetch fails → `Đã xong` silently falls back to
  the in-session served list; no error surfaced to the kitchen.

## 6. Data flow summary
1. Staff logs in → FE server-fn stores tokens in httpOnly cookies.
2. `/kitchen` guard validates the session server-side (refresh if needed) and gates on role.
3. Page loads queue + served-recent via authed server-fns; opens the SSE proxy stream.
4. Any SSE event → refetch queue + served-recent (polling fallback if the stream is down).
5. `Bắt đầu` / `Xong →` PATCH the item status (optimistic); SERVED stamps `servedAt` on the BE
   and the item appears in `Đã xong`.
6. `Hết món` toggles menu-item availability, immediately hiding the dish from the customer menu.

## 7. Sequencing (FE only)
1. **Auth slice** — entities, cookie helpers, auth server-fns, login page, `/kitchen` guard.
2. **Kitchen** — kitchen server-fns, SSE proxy + hook, board/card/sold-out UI, page wiring,
   with `Đã xong` degrading to the in-session list until the BE endpoint exists.
3. **Tests** — unit + component + e2e; verify against the seeded BE
   (`kitchen@demo.test` / `kitchen-password`).

The BE `served-recent` endpoint is delivered separately by the BE team from the handoff
contract; the FE works without it (degraded `Đã xong`) and lights up fully once it ships.
