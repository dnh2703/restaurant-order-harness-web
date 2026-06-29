# US-3.1 Customer adds dishes to the cart

## Status

implemented

## Lane

normal

## Product Contract

As a Customer, I can add dishes to a cart from the menu page, adjust quantities
with a stepper, remove items, and see a live-updating subtotal — all before
submitting the order to the kitchen.

## Relevant Product Docs

- `docs/product/menu-browsing.md`

## Acceptance Criteria

- Tapping "Add" on a dish adds it to the cart (quantity 1 if new, +1 if already
  present).
- A qty stepper (− / +) lets the customer increase or decrease quantity.
- Reducing quantity to 0 removes the item from the cart.
- A running subtotal (sum of unit_price × quantity for all lines) updates
  immediately on every change.

## Design Notes

- Commands: `addItem(item)`, `setQuantity(id, qty)` on the cart model.
- Queries: `cartCount`, `cartSubtotal` derived from the cart state.
- API: no network call — cart state is client-side only (no persistence across
  page reloads in this story).
- UI surfaces:
  - `entities/cart/model` — Zustand (or equivalent) store: `CartLine[]` state,
    `addItem`, `setQuantity`, `cartCount`, `cartSubtotal`.
  - `widgets/cart-panel` — slide-in or bottom-sheet panel showing cart lines,
    stepper per line, subtotal, and "Gửi bếp" submit button.
  - `pages/customer-menu` — wires `MenuGrid` add-button to `addItem`; renders
    `CartPanel`.
- Domain rules: qty stepper enforces minimum 0 (auto-remove); subtotal is
  computed in integers (VND).

## Validation

Verify command: `bun run validate` (`tsc --noEmit && vitest run`).

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | `entities/cart/model` — addItem, setQuantity, cartCount, cartSubtotal; `widgets/cart-panel` renders lines + subtotal | ✅ vitest — cart/model + cart-panel tests green |
| Integration | `pages/customer-menu` test: add dish → cart panel shows updated total | ✅ vitest page add-to-cart updates total |
| E2E | click "Add" on a dish → CartPanel shows item and subtotal | ⏳ not yet authored (seed now available via `qr-table-01`; test pending) |
| Platform | n/a (web) | n/a |
| Release | — | — |

Proof: unit=1, integration=1, e2e=0. Backlog #2 (e2e seed) is now closed — a
cart-add e2e is writable against `qr-table-01` — but that test has not been
authored yet, so e2e proof stays 0 here until it is.

## Harness Delta

- Registered US-3.1 in the durable matrix with proof booleans.
- Created epic directory `docs/stories/epics/E03-cart-ordering/`.

## Evidence

- `bun run validate` → clean (tsc + vitest 35/35).
- vitest covers: `cart/model` (addItem/setQuantity/count/subtotal), `CartPanel`
  (render lines + subtotal display), `CustomerMenuPage` (add → panel updates).
