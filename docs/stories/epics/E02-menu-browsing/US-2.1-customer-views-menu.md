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

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | format helpers, MenuList rendering | none |
| Integration | server fn ↔ BE round-trip | none (manual only) |
| E2E | open `/t/<token>` → menu renders | none |
| Platform | n/a (web) | n/a |
| Release | — | — |

Proof flags are all 0: the behavior is implemented and verified manually (SSR
render + `tsc` clean + invalid-token error path), but no automated tests exist
yet. See backlog item for adding a test runner.

## Harness Delta

- Created `docs/product/menu-browsing.md`.
- Backfilled intake + story + trace that were skipped during the initial scaffold.
- Backlog: no FE test runner configured yet (recorded).

## Evidence

- `bun run typecheck` → clean.
- Manual SSR: `GET /` renders home; `GET /t/demo` (invalid) renders "Bàn không hợp lệ".
- Commit `99be21c`.
