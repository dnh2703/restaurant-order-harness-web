# US-4.2 Kitchen advances dish status

## Status

implemented

## Lane

high-risk

## Product Contract

As Kitchen staff, I update a dish's status from `PENDING → COOKING → SERVED`. Changes
push to the board in realtime and the served item appears in `Đã xong`.

## Relevant Product Docs

- `docs/product/kitchen-screen.md`

## Acceptance Criteria

- `Chờ làm` cards show **Bắt đầu** → transitions to `COOKING`.
- `Đang làm` cards show **Xong →** → transitions to `SERVED`.
- Failed transitions show an error toast and roll back optimistic UI updates.
- SSE `order_item.updated` event refreshes the board without a full reload.

## Design Notes

- Server fn: `advanceOrderItemStatus` → `PATCH /api/kitchen/order-items/:id/status`.
- Optimistic updates in `KitchenScreenPage` with rollback on failure.

## Validation

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | card button wiring + server fn PATCH body | ✅ KitchenCard Bắt đầu/Xong; kitchen.test advanceItem |
| Integration | page click triggers advance server fn | ✅ KitchenScreenPage advancing test |
| E2E | full advance flow in browser | ❌ not covered (manual verification in E04 plan Step 4) |
| Platform | n/a | n/a |

Proof: unit=1, integration=1, e2e=0.

## Harness Delta

- Registered US-4.2 in durable matrix after PR #6 merge.

## Evidence

- `npm run validate` → 122/122 vitest.
- Merged via PR #6 (`9287768`).
