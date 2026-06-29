# US-3.2 Customer submits the order to the kitchen

## Status

implemented

## Lane

normal

## Product Contract

As a Customer, I tap "Gửi bếp" (Send to kitchen) and my cart is posted to the
open order for my table. Order items are created with status `PENDING` on the
backend, the cart is cleared, and a confirmation is shown. I can add more dishes
and submit again within the same session (appends to the same `OPEN` order).

## Relevant Product Docs

- `docs/product/menu-browsing.md`

## Acceptance Criteria

- Submitting the cart calls `POST /api/qr/{qrToken}/order-items` with each cart
  line.
- Created `order_items` receive status `PENDING`.
- After a successful submit, the cart clears and a confirmation is shown.
- Submitting again within the same session appends new items to the existing
  `OPEN` order (multiple rounds of ordering supported).

## Design Notes

- Commands: `submitOrderItems(token, lines)` server function that `POST`s to the
  BE.
- API: `POST /api/qr/{qrToken}/order-items` (BE endpoint); proxied through
  `shared/api/order` (`submitOrderItems` `createServerFn`).
- UI surfaces:
  - `widgets/cart-panel` — "Gửi bếp" button triggers `submitOrderItems`; on
    success clears cart and shows confirmation state.
  - `pages/customer-menu` — hosts `CartPanel`; no additional wiring needed
    beyond what US-3.1 established.
- Domain rules: order_items `unit_price` = dish price at submit time (snapshot);
  quantity must be ≥ 1; the order must be `OPEN` (BE enforces this).

## Validation

Verify command: `bun run validate` (`tsc --noEmit && vitest run`).

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | `widgets/cart-panel` submit button wires to `submitOrderItems`; confirmation state renders after mock success | ✅ vitest — cart-panel submit test green |
| Integration | `pages/customer-menu` submit flow: add item → submit → mock order server fn called → cart cleared | ✅ vitest page submit flow (mocks order server fn) |
| E2E | add dish → tap "Gửi bếp" → order created on real BE | ⏳ not yet authored (seed available; test would mutate the seeded order) |
| Platform | n/a (web) | n/a |
| Release | — | — |

Proof: unit=1, integration=1, e2e=0. Backlog #2 (e2e seed) is closed — a submit
e2e is writable against `qr-table-01` — but it would POST a real order to the BE
(mutating the seeded open order on each run), so it is left unauthored pending a
reset/isolation decision. e2e proof stays 0 here.

## Harness Delta

- Registered US-3.2 in the durable matrix with proof booleans.

## Evidence

- `bun run validate` → clean (tsc + vitest 35/35).
- vitest covers: `CartPanel` (submit button + confirmation), `CustomerMenuPage`
  (add → submit → cart cleared, order server fn mocked).
