# E07 — Reports (Admin) — Design

- **Date:** 2026-07-04
- **Epic:** E07 — Reports
- **Story:** US-7.1 — Admin views revenue & top-selling dishes over a date range
- **Scope:** Frontend only. Backend endpoints already exist and are live.
- **Access:** `ADMIN` only (same guard family as `/kitchen/tables`, `/kitchen/menu`).

## 1. Goal

Give an admin a single Reports screen under `/kitchen/reports` that answers two
questions for a chosen date range:

1. **How much did we make?** — daily revenue trend + totals (revenue, order count).
2. **What sold best?** — top-selling dishes by quantity and revenue.

Both are read-only. No mutation, no export in this slice (YAGNI — CSV/print can
be a later slice if requested).

## 2. Backend contract (verified live against BE :3000)

Both require an `ADMIN` bearer token. Envelope is `{ data: ... }`, like every
other endpoint the FE consumes.

### `GET /api/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD`

```json
{ "data": {
  "days": [ { "day": "2026-07-04", "revenue": 566000, "orderCount": 1 } ],
  "summary": { "from": "2026-06-01", "to": "2026-07-04", "totalRevenue": 566000, "totalOrders": 1 }
}}
```

- `from`/`to` required, pattern `^\d{4}-\d{2}-\d{2}$`.
- `days` is sparse — only days with activity appear. The FE must **fill the gap
  days** (zero revenue) across the requested range so the chart x-axis is
  continuous. This is the one non-obvious data-shaping requirement.

### `GET /api/reports/top-dishes?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=N`

```json
{ "data": { "dishes": [ { "menuItemId": "…", "name": "Phở bò", "quantitySold": 8, "revenue": 417000 } ] } }
```

- `limit` optional, 1–50. We send `limit=10`.
- `dishes` already sorted best-first by the BE.

## 3. Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Slice scope | Both revenue **and** top dishes on one page | Both endpoints exist; cohesive dashboard |
| Revenue chart | Native SVG bar chart, **no new dependency** | Self-contained; matches the "native widgets" direction of intake #6 |
| Date-range UX | Preset buttons (Hôm nay / 7 ngày / 30 ngày) + custom from–to inputs; default **last 7 days** | Fast common case, still flexible |
| Top dishes render | Shared `DataTable` (`@/shared/ui`) | Reuse existing table primitive |
| Currency | `đ` with thousands grouping, reuse existing money formatter | Consistency with cashier/invoice |

## 4. Architecture (FSD)

Follows the exact layering already used by the cashier feature.

```
src/shared/api/types/reports.ts        # RevenueReport, RevenueDay, TopDish types
src/shared/api/reports-normalize.ts    # envelope → typed model; gap-day fill
src/shared/api/reports.server.ts       # fetchRevenue / fetchTopDishes via authedFetch
src/shared/api/reports.ts              # createServerFn wrappers (getRevenueReport, getTopDishes)

src/pages/reports-screen/
  ReportsScreenPage.tsx                # shell: SideNav + TopNav + date control + widgets
  index.ts

src/widgets/date-range-control/        # presets + from/to inputs, emits { from, to }
src/widgets/revenue-summary/           # summary tiles (tổng doanh thu, số đơn, TB/đơn)
src/widgets/revenue-chart/             # native SVG daily bar chart
src/widgets/top-dishes-table/          # DataTable of top dishes

src/routes/kitchen.reports.tsx         # guarded route, ADMIN, mirrors kitchen.cashier.tsx
```

Edits to existing files:

- `src/routes/kitchen.tsx` — extend `resolveKitchenAccess`: treat
  `/kitchen/reports` as an admin route (add to the `isAdminRoute` predicate).
  `kitchenLandingForRole` unchanged (admin still lands on `/kitchen`).
- `src/widgets/side-nav/SideNav.tsx` — add a **Báo cáo** nav item (ADMIN only),
  extend `activeSection` union with `'reports'`. Update `SideNav.test.tsx`.

## 5. Data flow

1. Route loader (`kitchen.reports.tsx`) reuses the parent `/kitchen` session;
   redirects to `/kitchen/login` if absent (same as cashier route).
2. `ReportsScreenPage` holds date-range state (default last 7 days). On mount and
   on every range change it calls the two server functions in parallel.
3. Server functions (`reports.ts`) run on the server, pull the cookie token store,
   call `reports.server.ts` fetchers, which hit BE with `authedFetch`.
4. `reports-normalize.ts` unwraps `{ data }`, coerces numbers, and **fills gap
   days** for the revenue series before it reaches the chart.
5. Widgets render. Loading = skeleton/placeholder; error = localized message
   (same `Không tải được dữ liệu` style as cashier).

## 6. Component contracts

- **DateRangeControl** — props `{ value: { from, to }, onChange }`. Presets set
  both dates; custom inputs are plain `<input type="date">` (visible, styled like
  cashier inputs). Validates `from <= to`; clamps otherwise.
- **RevenueSummary** — props `{ summary }`. Three tiles: Tổng doanh thu, Số đơn,
  Trung bình/đơn (derived = total/orders, guard divide-by-zero → 0).
- **RevenueChart** — props `{ days }` (gap-filled). Pure SVG: one bar per day,
  height scaled to max revenue, x labels thinned if range is long, accessible
  (`role="img"` + `aria-label` summarizing range + total; each bar has a
  `<title>` tooltip `day: đX`). No animation needed.
- **TopDishesTable** — props `{ dishes }`. Columns: Hạng (#), Món, Số lượng bán,
  Doanh thu. Empty state: "Chưa có dữ liệu bán hàng trong khoảng này."

## 7. Testing (matches TEST_MATRIX conventions)

**Unit (Vitest):**
- `reports-normalize` — envelope unwrap, number coercion, **gap-day fill**
  correctness (sparse `days` → continuous range, zeros inserted, order preserved).
- `DateRangeControl` — presets compute correct from/to; `from > to` is corrected.
- `RevenueSummary` — average/order math incl. zero-orders guard.
- `RevenueChart` — renders one bar per day; aria-label present; scales to max.
- `TopDishesTable` — rows render; empty state shows.

**Integration (Vitest):**
- `ReportsScreenPage` — mounts, mocks both server fns, renders tiles + chart +
  table; changing range refetches with new params.

**E2E (Playwright, gated):**
- `reports.spec.ts` — gated on `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` (seed
  `admin@demo.test` / `admin-password`). Login → `/kitchen/reports` → assert
  summary total and top-dishes rows render. Skips cleanly without creds, like the
  other gated e2e specs.

## 8. Non-goals (this slice)

- CSV / PDF export, printing.
- Charts beyond the daily revenue bar (no per-dish pie, no hourly breakdown).
- Real-time refresh / SSE (reports are pull-on-demand).
- Adding a charting library.
- Filtering by category/table/staff.

## 9. Harness

- Record intake: `spec_slice`, risk `normal`, summary
  "E07 US-7.1 admin revenue & top-dishes reports screen (FE against existing BE
  /api/reports/*)".
- Create story packet `docs/stories/epics/E07-reports/US-7.1-admin-views-reports.md`.
- After merge, register US-7.1 in the harness matrix with proof evidence.
- Update `docs/stories/backlog.md` E07 row to sliced.
