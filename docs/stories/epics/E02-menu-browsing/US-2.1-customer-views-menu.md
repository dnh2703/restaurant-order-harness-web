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
- Phase 1 redesign: `widgets/menu-list` renamed/replaced by `widgets/menu-grid`;
  `widgets/top-nav` added; 2-col responsive layout + 3-col dish grid applied.

## Evidence

- `bun run validate` → clean (tsc + vitest 35/35 as of Phase 1).
- `bun run test:e2e` → playwright 2/2 (home + invalid-token), 1 skipped.
- Commits `99be21c` (scaffold), test infra + Phase 1 redesign (this cycle).
