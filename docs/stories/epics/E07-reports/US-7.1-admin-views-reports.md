# US-7.1 — Admin views revenue & top-selling dishes

**Epic:** E07 — Reports
**Status:** implemented (FE)

## Story

As an **admin**, I want to see daily revenue and the best-selling dishes over a
date range, so I can understand how the restaurant is performing.

## Scope

- Route `/kitchen/reports`, ADMIN-only (guarded by the `/kitchen` shell).
- Date-range control: presets (Hôm nay / 7 ngày / 30 ngày) + custom from–to;
  default last 7 days.
- Revenue: summary tiles (tổng doanh thu, số đơn, trung bình/đơn) + shadcn/recharts
  daily bar chart. Gap days filled with zero so the axis is continuous.
- Top dishes: ranked table (Hạng, Món, Số lượng bán, Doanh thu), limit 10.
- Loading: skeleton state (page starts loading so first paint never shows empty
  content; skeleton tile heights match real tiles to avoid layout shift).

## Backend (existing)

- `GET /api/reports/revenue?from=&to=` → `{ data: { days[], summary } }`
- `GET /api/reports/top-dishes?from=&to=&limit=` → `{ data: { dishes[] } }`
- Both require an ADMIN bearer token.

## Non-goals

CSV/PDF export, realtime refresh, category/table/staff filters.

## Proof

- Unit: date-range helpers, revenue normalizer gap-fill, summary math, chart
  container render, top-dishes table.
- Integration: ReportsScreenPage mounts, renders tiles/chart/table, refetches on
  range change.
- E2E: gated `reports.spec.ts` (E2E_ADMIN_EMAIL/PASSWORD).
