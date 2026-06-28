# US-2.1 Customer views the menu by category

## Status

implemented

## Lane

normal

## Product Contract

As a Customer, I open my table URL and view the menu grouped by category, with
each dish showing image, name, description, and price. Unavailable dishes are
dimmed and labeled sold out.

## Relevant Product Docs

- `docs/product/menu-browsing.md`

## Acceptance Criteria

- Menu is grouped by category.
- `unavailable` dishes are shown dimmed + a "Hết hàng" label.
- Restaurant name and table name shown in the header (US-1.2 overlap).
- Invalid/expired token shows an "Invalid table" screen.

## Design Notes

- API: `GET /api/qr/{qrToken}`, `GET /api/qr/{qrToken}/menu` (consumed via `createServerFn`).
- UI surfaces: route `/t/$qrToken`, `pages/customer-menu`, `widgets/menu-list`.
- Domain rules: money stored as VND integers; normalize string-serialized integers.

## Validation

Verify command: `bun run validate` (`tsc --noEmit && vitest run`).

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | format helpers, MenuList grouping/sold-out | ✅ vitest 8/8 |
| Integration | server fn ↔ BE round-trip | ✅ playwright invalid-token (404 → error UI) |
| E2E | open `/t/<token>` → menu renders grouped | ⏳ skipped (needs seeded token — backlog #2) |
| Platform | n/a (web) | n/a |
| Release | — | — |

Proof: unit=1, integration=1, e2e=0. The happy-path menu-render e2e is skipped
because data is fetched in a server function (server-side), so Playwright's
`page.route()` cannot mock the BE — it needs a seeded `qr_token` or an
`API_BASE_URL` stub (backlog #2).

## Harness Delta

- Created `docs/product/menu-browsing.md`.
- Backfilled intake + story + trace that were skipped during the initial scaffold.
- Added Vitest + Playwright (closed backlog #1); opened backlog #2 (e2e seed/stub).

## Evidence

- `bun run validate` → clean (tsc + vitest 8/8).
- `bun run test:e2e` → playwright 2/2 (home + invalid-token), 1 skipped.
- Commits `99be21c` (scaffold), test infra (this change).
