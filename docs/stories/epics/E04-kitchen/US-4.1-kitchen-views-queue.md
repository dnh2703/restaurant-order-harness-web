# US-4.1 Kitchen views the realtime make-queue

## Status

implemented

## Lane

high-risk

## Product Contract

As Kitchen staff, I view the queue of dishes to make in realtime, grouped into
`Chờ làm` and `Đang làm`, with table name, quantity, note, and options on each
card. Items are ordered oldest first. A `Đã xong` column shows recently served items.

## Relevant Product Docs

- `docs/product/kitchen-screen.md`
- `docs/superpowers/specs/2026-06-30-kitchen-screen-e04-design.md`

## Acceptance Criteria

- Authenticated `KITCHEN`/`ADMIN` user sees the three-column board at `/kitchen`.
- Queue items show table, qty, name, note, and options.
- Board refreshes via staff SSE with polling fallback (`Trực tiếp` / `Đang dò` badge).
- Unauthenticated access to `/kitchen` redirects to `/kitchen/login`.
- `fetchServed` degrades gracefully when the served-recent endpoint errors.

## Design Notes

- Thin staff auth (httpOnly cookies, refresh-on-401) unlocks all kitchen routes.
- `useKitchenStream` hook + SSE proxy route `api/stream.restaurant.$id.ts`.
- UI: `KitchenBoard`, `KitchenCard`, `KitchenScreenPage`.

## Validation

Verify command: `npm run validate` (`tsc --noEmit && vitest run`).

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | model normalizers, stream hook, board/card render | ✅ vitest: model, useKitchenStream, KitchenBoard, KitchenCard |
| Integration | server fn queue fetch + page renders queue column | ✅ kitchen.test fetchQueue; KitchenScreenPage queue header |
| E2E | login → board visible; unauthenticated redirect | ✅ kitchen.spec redirect always; login happy-path with `E2E_KITCHEN_*` + seeded BE |
| Platform | n/a (web) | n/a |

Proof: unit=1, integration=1, e2e=1.

## Harness Delta

- Created `docs/product/kitchen-screen.md`.
- Registered US-4.1 in durable matrix after PR #6 merge.

## Evidence

- `npm run validate` → 122/122 vitest, typecheck clean (post E04 merge).
- `npm run test:e2e -- kitchen.spec.ts -g redirects` → PASS without env.
- Happy-path login e2e: `E2E_KITCHEN_EMAIL=kitchen@demo.test E2E_KITCHEN_PASSWORD=kitchen-password` + BE `bun run db:seed`.
- Merged via PR #6 (`9287768`).
