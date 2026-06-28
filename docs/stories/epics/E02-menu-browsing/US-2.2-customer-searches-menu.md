# US-2.2 Customer searches/filters the menu

## Status

implemented

## Lane

normal

## Product Contract

As a Customer, I can type a search term to filter dishes by name (regardless of
Vietnamese diacritics) and tap a category chip to narrow the list by category.
URL search params (`?q=` and `?cat=`) persist the filter state so sharing or
refreshing the link retains the view.

## Relevant Product Docs

- `docs/product/menu-browsing.md`

## Acceptance Criteria

- Search by name is diacritic-insensitive (e.g. "pho" matches "Phở").
- Filter by category shows only dishes from the selected category.
- Both filters may be applied simultaneously.
- Filter state is reflected in URL search params `?q=` and `?cat=`.

## Design Notes

- Queries: client-side filtering only — no extra BE call on each keystroke.
- API: reuses `GET /api/qr/{qrToken}/menu` (data already loaded on page entry).
- UI surfaces:
  - `widgets/top-nav` — search input bound to `?q=`.
  - `widgets/menu-grid` — category chip strip bound to `?cat=`; renders filtered
    dish subset.
  - `pages/customer-menu` — passes resolved `{ q, cat }` params from route into
    widgets.
  - Route: `t.$qrToken.tsx` (TanStack Start file-based route).
- FSD library: `shared/lib/diacritics` — `normalize(str)` strips diacritics for
  case/accent-insensitive comparison.
- FSD entity: `entities/menu/filter` — `filterMenu(categories, { q, cat })` and
  `countItems(categories)` helpers.
- Domain rules: filtering is purely presentational; the full menu payload is
  fetched once and cached for the session.

## Validation

Verify command: `bun run validate` (`tsc --noEmit && vitest run`).

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | `shared/lib/diacritics` normalize, `entities/menu/filter` filterMenu + countItems, TopNav search input, MenuGrid category chips | ✅ vitest — diacritics + filter + menu-grid tests green |
| Integration | CustomerMenuPage filter-from-props test (props drive widget output) | ✅ vitest page filter test passes |
| E2E | type "pho" in search → filtered dishes shown; tap category chip → filtered | ⏳ skipped — needs seeded `qr_token` (backlog #2) |
| Platform | n/a (web) | n/a |
| Release | — | — |

Proof: unit=1, integration=1, e2e=0. E2E skipped for the same reason as US-2.1:
data is loaded server-side via `createServerFn`; Playwright cannot intercept it
without a seeded token or API stub (backlog #2).

## Harness Delta

- Registered US-2.2 in the durable matrix with proof booleans.

## Evidence

- `bun run validate` → clean (tsc + vitest 35/35).
- `bun run test:e2e` → playwright 2/2, 1 skipped (unchanged).
- vitest covers: `diacritics`, `menu/filter`, `TopNav` (search), `MenuGrid`
  (chips), `CustomerMenuPage` (filter-from-props).
