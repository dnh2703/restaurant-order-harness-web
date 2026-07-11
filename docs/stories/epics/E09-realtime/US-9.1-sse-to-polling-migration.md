# US-9.1 Switch realtime delivery from SSE to polling

## Status

implemented

## Lane

normal

## Product Contract

Customer order tracking, kitchen queue/served-recent, and cashier open tables
must reflect item status changes within a few seconds, using polling only. No
`EventSource`/SSE connections are attempted anywhere in the FE.

## Relevant Product Docs

- `docs/product/kitchen-screen.md`

## Acceptance Criteria

- No `EventSource` usage remains anywhere in `src/`.
- `useOrderStream`, `useKitchenStream`, `useOpenTables` poll their existing
  GET endpoints every ~2.5s while mounted, and stop polling on unmount.
- The two FE proxy routes to the retired BE SSE endpoints
  (`/api/qr/$qrToken/stream`, `/api/stream/restaurant/$id`) are removed.
- No connection/status indicator ("Trực tiếp", "Đang dò", "Đang đồng bộ…")
  remains in the UI — with polling as the only, unconditional mode, a
  connection-status affordance is meaningless noise, not information.

## Design Notes

- Commands: none (read-only polling).
- Queries: `getOrder`, `fetchKitchenQueue`, `fetchServedRecent`, `getOpenTables`
  (unchanged; already the polling fallback's data source).
- API: BE removed `GET /api/qr/:qrToken/stream` and
  `GET /api/stream/restaurant/:id` (both now 404) — see BE decision 0022 and
  BE issue #20.
- Domain rules: none changed; this is delivery mechanism only.
- UI surfaces: `OrderTracker`, `KitchenScreenPage` header badge,
  `CashierScreenPage` header badge.

## Harness Delta

BE-driven breaking change tracked as
`dnh2703/restaurant-order-harness-server#20`. This story is the FE-side
closure of that issue. Epic E09 previously had no story packet even though
the backlog table marked it "partially sliced" — this file is the first
formal story for it.

## Validation

`scripts/bin/harness-cli story update --id US-9.1 --unit 1 --integration 0 --e2e 0 --platform 0`

| Layer | Expected proof |
| --- | --- |
| Unit | `useOrderStream`, `useKitchenStream`, `useOpenTables` polling-only behavior |
| Integration | Existing screen-mount tests continue to pass without SSE mocks |
| E2E | Not re-verified live (existing gated specs don't assert live/polling badge text) |
| Platform | n/a |
| Release | n/a |

## Evidence

- `bun run validate` → typecheck clean + 285/285 unit/component tests.
- `bun run lint` → clean (2 pre-existing unrelated warnings only).
- Manual browser check via a temporary Playwright spec run through
  `bunx playwright test` (proven-working path in this environment; direct
  `import { chromium } from 'playwright'` in an ad-hoc script hangs on import
  under the harness sandbox — use the `@playwright/test` runner instead):
  kitchen board and cashier screens loaded cleanly, zero requests to the
  retired `/stream` endpoints, zero console errors, over two ~2.5s poll
  cycles.
- Follow-up: dropped the "Đang dò" kitchen/cashier badges and the order
  tracker's "Đang đồng bộ…" connection dot entirely (`bun run validate` →
  284/284 unit/component tests, `bun run lint` clean) — the badge only made
  sense as a live/fallback distinction, which no longer exists.
