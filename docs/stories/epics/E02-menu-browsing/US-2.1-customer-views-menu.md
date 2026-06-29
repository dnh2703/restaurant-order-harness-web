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
- UI surfaces: route `t.$qrToken.tsx`, `pages/customer-menu`, `widgets/top-nav`, `widgets/menu-grid`.
  (Renamed from `widgets/menu-list` to `widgets/menu-grid` in the Phase 1 redesign.)
- Layout redesign (Phase 1): desktop 2-column responsive layout; dish grid uses 3 columns on ≥md
  breakpoint; sticky `TopNav` shows restaurant name and table; `MenuGrid` replaces the old
  `MenuList` flat list.
- FSD entities added: `entities/menu`, `entities/table`, `shared/api/qr`.
- Domain rules: money stored as VND integers; normalize string-serialized integers.

## Validation

Verify command: `bun run validate` (`tsc --noEmit && vitest run`).

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | format helpers, MenuGrid grouping/sold-out, TopNav render | ✅ vitest (35 total, covers format + MenuGrid + TopNav + CustomerMenuPage) |
| Integration | server fn ↔ BE round-trip; invalid-token → error UI | ✅ playwright invalid-token (404 → error UI) |
| E2E | open `/t/<token>` → menu renders (chips + dishes) | ✅ playwright passes with `E2E_QR_TOKEN=qr-table-01` |
| Platform | n/a (web) | n/a |
| Release | — | — |

Proof: unit=1, integration=1, e2e=1. The happy-path menu-render e2e now runs
against the seeded BE: `bun run db:seed` (in `restaurant-order-harness-server`)
creates fixed tokens `qr-table-01..03`, and `E2E_QR_TOKEN=qr-table-01 bun run
test:e2e` renders the real menu. Without the env var the test skips cleanly
(CI-safe), since data is fetched server-side and `page.route()` cannot mock the
BE. **Backlog #2 closed.**

## Harness Delta

- Created `docs/product/menu-browsing.md`.
- Backfilled intake + story + trace that were skipped during the initial scaffold.
- Added Vitest + Playwright (closed backlog #1); opened then **closed backlog #2**
  (e2e seed): BE `bun run db:seed` + `E2E_QR_TOKEN` lights up the happy-path e2e.
- Phase 1 redesign: `widgets/menu-list` renamed/replaced by `widgets/menu-grid`;
  `widgets/top-nav` added; 2-col responsive layout + 3-col dish grid applied.

## Evidence

- `bun run validate` → clean (tsc + vitest 36/36 as of Phase 1).
- `E2E_QR_TOKEN=qr-table-01 bun run test:e2e` → playwright 4/4 (home, invalid-token,
  valid-token menu render, search filter). Without the token: 2 passed, 2 skipped.
- Commits `99be21c` (scaffold), test infra + Phase 1 redesign + e2e seed (this cycle).
