# Customer Dish Detail + Options Design (US-2.3)

**Story:** US-2.3 — As a Customer, I view dish details + choose toppings/options/notes.

**AC (from SPEC):** option groups (required radio / multi-select checkbox); free-text note; price updates based on options.

## Context

The customer menu flow (Phase 1) lets a customer browse, search, add to cart, and
submit. Today the `+` button on a dish card adds the dish straight to the cart, and a
cart line is `{ id, name, price, imageUrl, quantity }`. Submit posts only
`{ menuItemId, quantity }`.

The backend already supports the full feature:

- `GET /api/qr/{qrToken}/menu` returns each item with `optionGroups`
  (`type: SINGLE | MULTI`, `isRequired`, `options: { id, name, priceDelta }[]`).
  These are already typed in `src/entities/menu/model.ts` and money-normalized in `getMenu`.
- `POST /api/qr/{qrToken}/order-items` accepts per item:
  `menuItemId` (required), `quantity` (required), `note` (string | null, optional),
  `optionIds` (uuid[], optional).

So US-2.3 is **frontend-only**: surface a dish detail view that lets the customer pick
options and a note, reflect option price deltas live, and carry the selection through the
cart into the submit payload.

## Decisions

- **Detail open model — hybrid.** A dish with **no** option groups keeps the current
  quick-add: `+` adds it straight to the cart. A dish **with** option groups opens a
  detail view when the card (or its `+`) is tapped, so options/note can be chosen.
- **Presentation — bottom sheet.** Reuse the existing vaul `Drawer` with
  `direction="bottom"` (customers are on phones after a QR scan).
- **Cart line identity — split by option+note.** Each distinct combination of
  `menuItemId + selected optionIds + note` is its own cart line; an identical
  combination merges (sums quantity).
- **Required groups.** A required **SINGLE** group pre-selects its first option (price is
  always valid). A required **MULTI** group requires ≥1 selection; the "Add to cart"
  button is disabled until every required group is satisfied.
- **Editing in cart.** The cart only adjusts quantity per line. To change options, the
  customer removes the line and adds again (keeps the cart simple — YAGNI).
- **Detail sheet** includes a quantity stepper (default 1) and a note textarea; the
  footer button reads `Thêm vào giỏ · {live price × quantity}`.

## Architecture

Pure selection/cart logic is separated from React so it can be unit-tested in isolation;
the components only render and dispatch.

### 1. `src/entities/menu/dish-selection.ts` (new — pure)

Manages the in-progress option selection for one dish.

- `type Selection = Record<string, string[]>` — keyed by `optionGroup.id`, values are
  selected `option.id`s.
- `defaultSelection(item: MenuItem): Selection` — pre-selects the first option of every
  required SINGLE group; everything else empty.
- `toggleOption(selection, group, optionId): Selection` — SINGLE replaces the group's
  array with `[optionId]`; MULTI toggles membership.
- `selectedOptions(item, selection): { id; name; priceDelta }[]` — flat list, in menu
  order, of the chosen options.
- `selectionPrice(item, selection): number` — `item.price + Σ priceDelta`.
- `isSelectionValid(item, selection): boolean` — every `isRequired` group has ≥1 selection.

### 2. `src/entities/cart/model.ts` (rewritten)

```ts
interface CartOption { id: string; name: string; priceDelta: number }

interface CartLine {
  lineId: string          // signature of menuItemId + sorted optionIds + note
  menuItemId: string
  name: string
  imageUrl: string | null
  unitPrice: number       // base price + Σ option priceDelta
  options: CartOption[]
  note: string | null
  quantity: number
}
```

- `lineSignature(menuItemId, optionIds, note): string` — stable key from
  `menuItemId`, the **sorted** option ids, and the (trimmed) note.
- `addLine(cart, line): CartLine[]` — if a line with the same `lineId` exists, sum
  quantity; otherwise append.
- `setQuantity(cart, lineId, qty): CartLine[]` — qty ≤ 0 removes the line.
- `cartCount(cart)` / `cartSubtotal(cart)` — unchanged logic (`unitPrice × quantity`).
- `quantityByMenuItem(cart): Record<string, number>` — total quantity per `menuItemId`,
  for the badge on a dish card (a dish may span several lines).

> The old `addItem(cart, item)` / `price` field are replaced. `CustomerMenuPage`'s
> quick-add builds a line via `defaultSelection` + the new builder rather than `addItem`.

### 3. `src/widgets/dish-detail/DishDetailSheet.tsx` (new)

Renders inside a vaul `Drawer` (`direction="bottom"`).

- Props: `{ item: MenuItem | null; open: boolean; onOpenChange(open): void; onAdd(line: CartLine): void }`.
- Local state: `selection` (seeded from `defaultSelection(item)` when the item changes),
  `quantity`, `note`.
- Renders: image, name, description, then each option group:
  - SINGLE → radio inputs; MULTI → checkboxes. Each option shows its name and, when
    `priceDelta > 0`, `+{formatVND(priceDelta)}`. Required groups show a `*` marker.
  - A note textarea (placeholder e.g. "Ghi chú cho bếp…").
  - A quantity stepper (min 1).
- Footer button `Thêm vào giỏ · {formatVND(selectionPrice × quantity)}`, disabled when
  `!isSelectionValid`. On click: builds the `CartLine` (unitPrice = `selectionPrice`,
  options = `selectedOptions`, note = trimmed note or null) and calls `onAdd`, then closes.

### 4. `src/widgets/menu-grid/MenuGrid.tsx` (modified)

- New prop `onOpenDetail(item: MenuItem): void`; `quantities` prop now sourced from
  `quantityByMenuItem`.
- `DishCard`: if `item.optionGroups.length > 0`, tapping the card body **and** the `+`
  button call `onOpenDetail(item)`; otherwise `+` calls `onAdd(item)` (quick-add). The
  card body is only interactive (button/role) when it opens detail.

### 5. `src/widgets/cart-panel/CartPanel.tsx` (modified)

- Iterate/key by `line.lineId`; qty handlers use `lineId`.
- Under the dish name, render selected option names (joined `, `) and the note (if any),
  styled like the order tracker's secondary lines (`text-xs text-muted`).

### 6. `src/pages/customer-menu/CustomerMenuPage.tsx` (modified)

- State `detailItem: MenuItem | null`; the detail sheet opens when it is set.
- `onAdd(item)` (quick-add for option-less dishes) builds a line from
  `defaultSelection(item)`; `onOpenDetail(item)` sets `detailItem`.
- The sheet's `onAdd(line)` calls `addLine`.
- `quantities = quantityByMenuItem(cart)`.
- `onSubmit` maps each line → `{ menuItemId, quantity, note: line.note, optionIds: line.options.map(o => o.id) }`.

### 7. `src/shared/api/order.ts` (modified)

`SubmitInput.items` item type extends to
`{ menuItemId: string; quantity: number; note?: string | null; optionIds?: string[] }`.
The fetch body forwards them unchanged (BE accepts both optional fields).

## Data flow

```
MenuGrid card tap
  ├─ no options → onAdd(item) → addLine(defaultSelection line)
  └─ has options → onOpenDetail(item) → DishDetailSheet
        selection (dish-selection helpers) → onAdd(CartLine) → addLine
CartPanel (per-line qty) → onSubmit
  → submitOrderItems({ items: [{ menuItemId, quantity, note, optionIds }] })
```

## Edge cases

- Sold-out dish (`!isAvailable`): card stays disabled; detail not opened, add blocked
  (unchanged behavior).
- Empty/whitespace note → stored as `null` and excluded from the signature's note slot
  consistently.
- Re-opening the sheet for a different dish reseeds selection/quantity/note.
- Option price deltas may arrive as integer-strings from BE — already normalized in
  `getMenu`, so the model layer trusts numbers.

## Testing (TDD)

- **dish-selection.test.ts** — defaultSelection pre-selects required SINGLE first option;
  toggleOption SINGLE replaces / MULTI toggles; selectionPrice sums deltas;
  isSelectionValid gates on required groups.
- **cart/model.test.ts** — lineSignature stability + order-independence of optionIds;
  addLine merges identical / splits different; setQuantity by lineId removes at 0;
  quantityByMenuItem aggregates across lines.
- **DishDetailSheet.test.tsx** — renders groups with correct control type and required
  marker; footer disabled until required MULTI satisfied; price updates as options
  toggle; onAdd payload carries options + trimmed note + quantity.
- **CartPanel.test.tsx** — renders a line's option names and note; qty handlers fire with
  lineId.
- **MenuGrid.test.tsx** — option-less dish `+` calls onAdd; dish-with-options tap calls
  onOpenDetail; badge reflects quantityByMenuItem.
- **CustomerMenuPage.test.tsx** — open sheet → pick option → add → submit payload
  includes `optionIds` and `note`.
- **e2e/dish-options.spec.ts** — happy path: open a dish with an option, select it, add,
  see it (with option) in the cart, submit. Gated on `E2E_QR_TOKEN`.
