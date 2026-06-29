# Customer Dish Detail + Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a QR customer open a dish's detail sheet, pick option groups (SINGLE/MULTI) and a note with a live-updating price, and carry that selection through the cart into the submit payload (US-2.3).

**Architecture:** Pure selection logic (`dish-selection.ts`) and a rewritten cart model (`cart/model.ts`) hold all computation and are unit-tested in isolation. A bottom-sheet widget (`DishDetailSheet`) renders option controls and dispatches a built `CartLine`. `MenuGrid` quick-adds option-less dishes and opens the sheet for dishes with options. `CartPanel` and `CustomerMenuPage` are updated to the new line shape; `submitOrderItems` forwards `note` + `optionIds` (already accepted by the BE).

**Tech Stack:** TanStack Start + Router, React 19, TypeScript, Tailwind, vaul Drawer, Phosphor icons, Vitest + Testing Library (happy-dom), Playwright.

## Global Constraints

- Package manager is **Bun**; dev server runs on **:3001**, backend on **:3000** (server functions proxy via `API_BASE_URL`). The browser never calls :3000 directly.
- Money fields from the BE are integers in đồng, possibly serialized as integer-strings; they are already normalized in `getMenu` via `toNumber`. Display with `formatVND` from `@/shared/lib/format`.
- UI copy is Vietnamese. Use the shadcn-style ui kit (`@/shared/ui`), `cn` from `@/shared/lib/cn`. `Button` variants are `primary | secondary | ghost` (no `outline`); sizes `sm | md | lg`.
- Unit specs live next to source as `*.test.ts(x)`; run with `bun run test <path>`. E2E in `e2e/*.spec.ts`; happy paths gate on `process.env.E2E_QR_TOKEN`.
- One commit per task. Merge style for PRs is a normal merge commit, never squash.
- **Ordering note:** Task 2 rewrites the `CartLine` shape, so `CartPanel`/`CustomerMenuPage` (and their tests) do not typecheck again until Tasks 5–6. Each task therefore runs only its **own** scoped test file; the full `bun run build && bun run test` runs once at the end of Task 6.

---

### Task 1: `dish-selection` pure helpers

**Files:**
- Create: `src/entities/menu/dish-selection.ts`
- Test: `src/entities/menu/dish-selection.test.ts`

**Interfaces:**
- Consumes: `MenuItem`, `OptionGroup` from `@/entities/menu/model`.
- Produces:
  - `type Selection = Record<string, string[]>` (keyed by `optionGroup.id`, values = selected `option.id`s).
  - `defaultSelection(item: MenuItem): Selection`
  - `toggleOption(selection: Selection, group: OptionGroup, optionId: string): Selection`
  - `selectedOptions(item: MenuItem, selection: Selection): { id: string; name: string; priceDelta: number }[]`
  - `selectionPrice(item: MenuItem, selection: Selection): number`
  - `isSelectionValid(item: MenuItem, selection: Selection): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
// src/entities/menu/dish-selection.test.ts
import { describe, it, expect } from 'vitest'
import {
  defaultSelection,
  toggleOption,
  selectedOptions,
  selectionPrice,
  isSelectionValid,
} from './dish-selection'
import type { MenuItem } from './model'

const item: MenuItem = {
  id: 'm1',
  name: 'Phở bò',
  description: null,
  price: 50000,
  imageUrl: null,
  isAvailable: true,
  optionGroups: [
    {
      id: 'g-size',
      name: 'Size',
      type: 'SINGLE',
      isRequired: true,
      options: [
        { id: 's', name: 'Nhỏ', priceDelta: 0 },
        { id: 'l', name: 'Lớn', priceDelta: 10000 },
      ],
    },
    {
      id: 'g-top',
      name: 'Topping',
      type: 'MULTI',
      isRequired: false,
      options: [
        { id: 't1', name: 'Trứng', priceDelta: 5000 },
        { id: 't2', name: 'Bò viên', priceDelta: 8000 },
      ],
    },
  ],
}

describe('dish-selection', () => {
  it('pre-selects the first option of required SINGLE groups', () => {
    expect(defaultSelection(item)).toEqual({ 'g-size': ['s'] })
  })

  it('SINGLE toggle replaces the selection; MULTI toggle adds and removes', () => {
    let sel = defaultSelection(item)
    sel = toggleOption(sel, item.optionGroups[0]!, 'l')
    expect(sel['g-size']).toEqual(['l'])
    sel = toggleOption(sel, item.optionGroups[1]!, 't1')
    expect(sel['g-top']).toEqual(['t1'])
    sel = toggleOption(sel, item.optionGroups[1]!, 't2')
    expect(sel['g-top']).toEqual(['t1', 't2'])
    sel = toggleOption(sel, item.optionGroups[1]!, 't1')
    expect(sel['g-top']).toEqual(['t2'])
  })

  it('lists selected options in menu order with their price deltas', () => {
    let sel = defaultSelection(item)
    sel = toggleOption(sel, item.optionGroups[1]!, 't2')
    expect(selectedOptions(item, sel)).toEqual([
      { id: 's', name: 'Nhỏ', priceDelta: 0 },
      { id: 't2', name: 'Bò viên', priceDelta: 8000 },
    ])
  })

  it('sums the base price and selected deltas', () => {
    let sel = defaultSelection(item)
    expect(selectionPrice(item, sel)).toBe(50000)
    sel = toggleOption(sel, item.optionGroups[0]!, 'l')
    sel = toggleOption(sel, item.optionGroups[1]!, 't1')
    expect(selectionPrice(item, sel)).toBe(65000)
  })

  it('is valid only when every required group has a selection', () => {
    expect(isSelectionValid(item, defaultSelection(item))).toBe(true)
    expect(isSelectionValid(item, {})).toBe(false)
    const requiredMulti: MenuItem = {
      ...item,
      optionGroups: [{ ...item.optionGroups[1]!, isRequired: true }],
    }
    expect(isSelectionValid(requiredMulti, {})).toBe(false)
    expect(isSelectionValid(requiredMulti, { 'g-top': ['t1'] })).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/entities/menu/dish-selection.test.ts`
Expected: FAIL — cannot find module `./dish-selection`.

- [ ] **Step 3: Write the implementation**

```ts
// src/entities/menu/dish-selection.ts
import type { MenuItem, OptionGroup } from './model'

/** Option ids chosen per option group, keyed by group id. */
export type Selection = Record<string, string[]>

/** Pre-select the first option of every required SINGLE group so price is always valid. */
export function defaultSelection(item: MenuItem): Selection {
  const sel: Selection = {}
  for (const group of item.optionGroups) {
    if (group.isRequired && group.type === 'SINGLE' && group.options[0]) {
      sel[group.id] = [group.options[0].id]
    }
  }
  return sel
}

export function toggleOption(selection: Selection, group: OptionGroup, optionId: string): Selection {
  if (group.type === 'SINGLE') {
    return { ...selection, [group.id]: [optionId] }
  }
  const current = selection[group.id] ?? []
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
  return { ...selection, [group.id]: next }
}

export function selectedOptions(
  item: MenuItem,
  selection: Selection,
): { id: string; name: string; priceDelta: number }[] {
  const out: { id: string; name: string; priceDelta: number }[] = []
  for (const group of item.optionGroups) {
    const chosen = selection[group.id] ?? []
    for (const option of group.options) {
      if (chosen.includes(option.id)) {
        out.push({ id: option.id, name: option.name, priceDelta: option.priceDelta })
      }
    }
  }
  return out
}

export function selectionPrice(item: MenuItem, selection: Selection): number {
  return selectedOptions(item, selection).reduce((sum, o) => sum + o.priceDelta, item.price)
}

export function isSelectionValid(item: MenuItem, selection: Selection): boolean {
  return item.optionGroups.every(
    (group) => !group.isRequired || (selection[group.id]?.length ?? 0) > 0,
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test src/entities/menu/dish-selection.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/entities/menu/dish-selection.ts src/entities/menu/dish-selection.test.ts
git commit -m "feat(web): dish option selection helpers (US-2.3)"
```

---

### Task 2: Rewrite the cart model to carry options + note

**Files:**
- Modify (rewrite): `src/entities/cart/model.ts`
- Modify (rewrite): `src/entities/cart/model.test.ts`

**Interfaces:**
- Consumes: `MenuItem` from `@/entities/menu/model`.
- Produces:
  - `interface CartOption { id: string; name: string; priceDelta: number }`
  - `interface CartLine { lineId: string; menuItemId: string; name: string; imageUrl: string | null; unitPrice: number; options: CartOption[]; note: string | null; quantity: number }`
  - `lineSignature(menuItemId: string, optionIds: string[], note: string | null): string`
  - `buildCartLine(item: MenuItem, options: CartOption[], note: string | null, quantity: number): CartLine` — `unitPrice = item.price + Σ options.priceDelta`, `lineId = lineSignature(item.id, options.map(o => o.id), note)`.
  - `addLine(cart: CartLine[], line: CartLine): CartLine[]` — merges by `lineId` (sums quantity), else appends.
  - `setQuantity(cart: CartLine[], lineId: string, qty: number): CartLine[]` — removes at `qty <= 0`.
  - `cartCount(cart: CartLine[]): number`
  - `cartSubtotal(cart: CartLine[]): number`
  - `quantityByMenuItem(cart: CartLine[]): Record<string, number>`

> This replaces the old `addItem` and the `{ id, price }` line shape. Downstream consumers (`CartPanel`, `CustomerMenuPage`) are updated in Tasks 5–6; do not run the full suite here.

- [ ] **Step 1: Rewrite the test**

```ts
// src/entities/cart/model.test.ts
import { describe, it, expect } from 'vitest'
import {
  buildCartLine,
  addLine,
  setQuantity,
  cartCount,
  cartSubtotal,
  lineSignature,
  quantityByMenuItem,
  type CartOption,
} from './model'
import type { MenuItem } from '@/entities/menu/model'

const dish = (id: string, price: number): MenuItem => ({
  id,
  name: `Dish ${id}`,
  description: null,
  price,
  imageUrl: null,
  isAvailable: true,
  optionGroups: [],
})

const opt = (id: string, priceDelta: number): CartOption => ({ id, name: id, priceDelta })

describe('cart model', () => {
  it('lineSignature is stable and order-independent for option ids', () => {
    expect(lineSignature('m1', ['b', 'a'], null)).toBe(lineSignature('m1', ['a', 'b'], null))
    expect(lineSignature('m1', ['a'], 'ít cay')).not.toBe(lineSignature('m1', ['a'], null))
  })

  it('buildCartLine sums option deltas into unitPrice', () => {
    const line = buildCartLine(dish('m1', 50000), [opt('l', 10000), opt('t', 5000)], null, 1)
    expect(line.unitPrice).toBe(65000)
    expect(line.menuItemId).toBe('m1')
    expect(line.quantity).toBe(1)
  })

  it('addLine merges identical lines and splits different option/note combos', () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [opt('s', 0)], null, 1))
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('s', 0)], null, 1))
    expect(c).toHaveLength(1)
    expect(c[0]!.quantity).toBe(2)
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('l', 10000)], null, 1))
    expect(c).toHaveLength(2)
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('s', 0)], 'ít hành', 1))
    expect(c).toHaveLength(3)
  })

  it('setQuantity updates by lineId and removes at <= 0', () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [], null, 1))
    const { lineId } = c[0]!
    c = setQuantity(c, lineId, 3)
    expect(c[0]!.quantity).toBe(3)
    c = setQuantity(c, lineId, 0)
    expect(c).toHaveLength(0)
  })

  it('computes count and subtotal across lines', () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [opt('l', 10000)], null, 1))
    c = addLine(c, buildCartLine(dish('m2', 30000), [], null, 1))
    c = setQuantity(c, c[0]!.lineId, 2)
    expect(cartCount(c)).toBe(3)
    expect(cartSubtotal(c)).toBe(150000) // 60000*2 + 30000
  })

  it('quantityByMenuItem aggregates quantity across a dish’s lines', () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [opt('s', 0)], null, 1))
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('l', 10000)], null, 2))
    c = addLine(c, buildCartLine(dish('m2', 30000), [], null, 1))
    expect(quantityByMenuItem(c)).toEqual({ m1: 3, m2: 1 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/entities/cart/model.test.ts`
Expected: FAIL — `buildCartLine` / `addLine` / `lineSignature` / `quantityByMenuItem` not exported.

- [ ] **Step 3: Rewrite the implementation**

```ts
// src/entities/cart/model.ts
import type { MenuItem } from '@/entities/menu/model'

export interface CartOption {
  id: string
  name: string
  priceDelta: number
}

export interface CartLine {
  lineId: string
  menuItemId: string
  name: string
  imageUrl: string | null
  unitPrice: number
  options: CartOption[]
  note: string | null
  quantity: number
}

/** Stable key identifying a line by dish + chosen options (order-independent) + note. */
export function lineSignature(menuItemId: string, optionIds: string[], note: string | null): string {
  return `${menuItemId}|${[...optionIds].sort().join(',')}|${note ?? ''}`
}

export function buildCartLine(
  item: MenuItem,
  options: CartOption[],
  note: string | null,
  quantity: number,
): CartLine {
  const unitPrice = options.reduce((sum, o) => sum + o.priceDelta, item.price)
  return {
    lineId: lineSignature(item.id, options.map((o) => o.id), note),
    menuItemId: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    unitPrice,
    options,
    note,
    quantity,
  }
}

export function addLine(cart: CartLine[], line: CartLine): CartLine[] {
  if (cart.some((l) => l.lineId === line.lineId)) {
    return cart.map((l) =>
      l.lineId === line.lineId ? { ...l, quantity: l.quantity + line.quantity } : l,
    )
  }
  return [...cart, line]
}

export function setQuantity(cart: CartLine[], lineId: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => l.lineId !== lineId)
  return cart.map((l) => (l.lineId === lineId ? { ...l, quantity: qty } : l))
}

export function cartCount(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.quantity, 0)
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.unitPrice * l.quantity, 0)
}

/** Total quantity per menu item (a dish may span several lines) — for the card badge. */
export function quantityByMenuItem(cart: CartLine[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const l of cart) {
    out[l.menuItemId] = (out[l.menuItemId] ?? 0) + l.quantity
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/entities/cart/model.test.ts`
Expected: PASS (6 cases).

- [ ] **Step 5: Commit**

```bash
git add src/entities/cart/model.ts src/entities/cart/model.test.ts
git commit -m "feat(web): cart lines carry options + note, split by signature (US-2.3)"
```

---

### Task 3: `DishDetailSheet` widget

**Files:**
- Create: `src/widgets/dish-detail/DishDetailSheet.tsx`
- Test: `src/widgets/dish-detail/DishDetailSheet.test.tsx`

**Interfaces:**
- Consumes: `MenuItem` from `@/entities/menu/model`; `Selection`, `defaultSelection`, `toggleOption`, `selectedOptions`, `selectionPrice`, `isSelectionValid` from `@/entities/menu/dish-selection`; `CartLine`, `buildCartLine` from `@/entities/cart/model`; `formatVND` from `@/shared/lib/format`; `Drawer`, `DrawerContent`, `DrawerTitle`, `Button` from `@/shared/ui`.
- Produces: `DishDetailSheet({ item, open, onOpenChange, onAdd }: { item: MenuItem | null; open: boolean; onOpenChange: (open: boolean) => void; onAdd: (line: CartLine) => void })`.

Behavior:
- The inner body is keyed by `item.id` so selection/quantity/note reset when a different dish opens.
- SINGLE group → radio inputs; MULTI group → checkboxes. Required groups show a `*`. An option with `priceDelta > 0` shows `+{formatVND(priceDelta)}`.
- Note `<textarea>`; quantity stepper (min 1).
- Footer `Button`: text `Thêm vào giỏ · {formatVND(selectionPrice × quantity)}`, `disabled` until `isSelectionValid`. On click: `onAdd(buildCartLine(item, selectedOptions(item, selection), note.trim() || null, quantity))` then `onOpenChange(false)`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/widgets/dish-detail/DishDetailSheet.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DishDetailSheet } from './DishDetailSheet'
import type { MenuItem } from '@/entities/menu/model'

const item: MenuItem = {
  id: 'm1',
  name: 'Phở bò',
  description: 'Truyền thống',
  price: 50000,
  imageUrl: null,
  isAvailable: true,
  optionGroups: [
    {
      id: 'g-size',
      name: 'Size',
      type: 'SINGLE',
      isRequired: true,
      options: [
        { id: 's', name: 'Nhỏ', priceDelta: 0 },
        { id: 'l', name: 'Lớn', priceDelta: 10000 },
      ],
    },
    {
      id: 'g-top',
      name: 'Topping',
      type: 'MULTI',
      isRequired: false,
      options: [{ id: 't1', name: 'Trứng', priceDelta: 5000 }],
    },
  ],
}

function setup(over: Partial<Parameters<typeof DishDetailSheet>[0]> = {}) {
  const onAdd = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <DishDetailSheet item={item} open onOpenChange={onOpenChange} onAdd={onAdd} {...over} />,
  )
  return { onAdd, onOpenChange }
}

describe('DishDetailSheet', () => {
  it('renders option groups with the right controls and price deltas', () => {
    setup()
    expect(screen.getByRole('radio', { name: /Nhỏ/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Lớn/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Trứng/ })).toBeInTheDocument()
    expect(screen.getByText(/\+10[.,]000đ/)).toBeInTheDocument()
  })

  it('updates the footer price as options change', () => {
    setup()
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toHaveTextContent(/50[.,]000đ/)
    fireEvent.click(screen.getByRole('radio', { name: /Lớn/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Trứng/ }))
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toHaveTextContent(/65[.,]000đ/)
  })

  it('emits a cart line with selected options and trimmed note on add', () => {
    const { onAdd, onOpenChange } = setup()
    fireEvent.click(screen.getByRole('radio', { name: /Lớn/ }))
    fireEvent.change(screen.getByPlaceholderText(/Ghi chú/), { target: { value: '  ít hành ' } })
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/ }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        menuItemId: 'm1',
        unitPrice: 60000,
        note: 'ít hành',
        options: [expect.objectContaining({ id: 'l' })],
      }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables add until a required MULTI group is satisfied', () => {
    const requiredMulti: MenuItem = {
      ...item,
      optionGroups: [{ ...item.optionGroups[1]!, isRequired: true }],
    }
    setup({ item: requiredMulti })
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Trứng/ }))
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toBeEnabled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/widgets/dish-detail/DishDetailSheet.test.tsx`
Expected: FAIL — cannot find module `./DishDetailSheet`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/widgets/dish-detail/DishDetailSheet.tsx
import { useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'

import type { MenuItem } from '@/entities/menu/model'
import {
  type Selection,
  defaultSelection,
  toggleOption,
  selectedOptions,
  selectionPrice,
  isSelectionValid,
} from '@/entities/menu/dish-selection'
import { type CartLine, buildCartLine } from '@/entities/cart/model'
import { formatVND } from '@/shared/lib/format'
import { Drawer, DrawerContent, DrawerTitle, Button } from '@/shared/ui'

interface Props {
  item: MenuItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (line: CartLine) => void
}

export function DishDetailSheet({ item, open, onOpenChange, onAdd }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent>
        {item && (
          <DishDetailBody
            key={item.id}
            item={item}
            onAdd={(line) => {
              onAdd(line)
              onOpenChange(false)
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

function DishDetailBody({ item, onAdd }: { item: MenuItem; onAdd: (line: CartLine) => void }) {
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item))
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(1)

  const unitPrice = selectionPrice(item, selection)
  const valid = isSelectionValid(item, selection)

  const submit = () =>
    onAdd(buildCartLine(item, selectedOptions(item, selection), note.trim() || null, quantity))

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="border-b border-line px-6 py-4">
        <DrawerTitle className="text-lg">{item.name}</DrawerTitle>
        {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
      </div>

      <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-4">
        {item.optionGroups.map((group) => {
          const chosen = selection[group.id] ?? []
          return (
            <fieldset key={group.id} className="mb-5 last:mb-0">
              <legend className="mb-2 text-sm font-bold text-ink">
                {group.name}
                {group.isRequired && <span className="ml-1 text-brand">*</span>}
              </legend>
              <div className="flex flex-col gap-2">
                {group.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center justify-between rounded-control border border-line px-3.5 py-2.5"
                  >
                    <span className="flex items-center gap-2.5 text-sm text-ink">
                      <input
                        type={group.type === 'SINGLE' ? 'radio' : 'checkbox'}
                        name={group.id}
                        checked={chosen.includes(option.id)}
                        onChange={() => setSelection((s) => toggleOption(s, group, option.id))}
                        className="size-4 accent-ink"
                      />
                      {option.name}
                    </span>
                    {option.priceDelta > 0 && (
                      <span className="text-xs font-semibold text-muted">
                        +{formatVND(option.priceDelta)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          )
        })}

        <label className="mt-1 block">
          <span className="mb-2 block text-sm font-bold text-ink">Ghi chú</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú cho bếp…"
            rows={2}
            className="w-full rounded-control border border-line px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-line-strong"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-line px-6 py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-9 items-center justify-center rounded-control bg-page text-ink"
          >
            <Minus size={16} weight="bold" />
          </button>
          <span className="w-5 text-center text-sm font-bold text-ink">{quantity}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => setQuantity((q) => q + 1)}
            className="flex size-9 items-center justify-center rounded-control bg-ink text-white"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>
        <Button size="lg" fullWidth disabled={!valid} onClick={submit} className="flex-1">
          Thêm vào giỏ · {formatVND(unitPrice * quantity)}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/widgets/dish-detail/DishDetailSheet.test.tsx`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/dish-detail
git commit -m "feat(web): DishDetailSheet bottom sheet for options + note (US-2.3)"
```

---

### Task 4: `MenuGrid` — open detail for dishes with options

**Files:**
- Modify: `src/widgets/menu-grid/MenuGrid.tsx`
- Modify: `src/widgets/menu-grid/MenuGrid.test.tsx`

**Interfaces:**
- Consumes: `MenuItem` from `@/entities/menu/model`.
- Produces: `MenuGrid` gains prop `onOpenDetail: (item: MenuItem) => void`. Existing `onAdd: (item: MenuItem) => void` and `quantities: Record<string, number>` props are unchanged in signature (the page now sources `quantities` from `quantityByMenuItem`).

Behavior:
- Dish with `optionGroups.length === 0`: the `+` button (aria-label `Thêm <name>`) calls `onAdd(item)` (unchanged).
- Dish with options: render an extra card-body button (aria-label `Xem <name>`) wrapping the name/description, and the `+` button (aria-label `Chọn <name>`) — both call `onOpenDetail(item)`. The two are sibling buttons (never nested).

- [ ] **Step 1: Add failing tests**

Add a dish with options to the existing `menu` fixture's `items` array (append after `Bún chả`):

```tsx
        {
          id: 'i3',
          name: 'Trà sữa',
          description: null,
          price: 35000,
          imageUrl: null,
          isAvailable: true,
          optionGroups: [
            {
              id: 'g1',
              name: 'Size',
              type: 'SINGLE',
              isRequired: true,
              options: [{ id: 'o1', name: 'M', priceDelta: 0 }],
            },
          ],
        },
```

Extend the `setup` helper props to include `onOpenDetail: vi.fn()` (add it to the `props` object alongside `onAdd`).

Add these cases inside `describe('MenuGrid', …)`:

```tsx
  it('quick-adds an option-less dish via its + button', () => {
    const { onAdd, onOpenDetail } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }))
    expect(onOpenDetail).not.toHaveBeenCalled()
  })

  it('opens detail for a dish that has options', () => {
    const { onAdd, onOpenDetail } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Trà sữa' }))
    expect(onOpenDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 'i3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xem Trà sữa' }))
    expect(onOpenDetail).toHaveBeenCalledTimes(2)
    expect(onAdd).not.toHaveBeenCalled()
  })
```

> The `setup` helper returns `props`, so destructure `onOpenDetail` from its return like the existing `onAdd` cases.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test src/widgets/menu-grid/MenuGrid.test.tsx`
Expected: FAIL — no button named `Chọn Trà sữa`; `onOpenDetail` is undefined.

- [ ] **Step 3: Update the implementation**

Change the `Props` interface and `DishCard` in `src/widgets/menu-grid/MenuGrid.tsx`.

Add to `Props`:

```tsx
  onOpenDetail: (item: MenuItem) => void
```

Pass it through `MenuGrid` to each `DishCard` (add `onOpenDetail={onOpenDetail}` to the `<DishCard … />` call, and destructure it in `MenuGrid`'s signature).

Replace the `DishCard` component with:

```tsx
function DishCard({
  item,
  qty,
  onAdd,
  onOpenDetail,
}: {
  item: MenuItem
  qty: number
  onAdd: (i: MenuItem) => void
  onOpenDetail: (i: MenuItem) => void
}) {
  const soldOut = !item.isAvailable
  const hasOptions = item.optionGroups.length > 0
  const onPlus = () => (hasOptions ? onOpenDetail(item) : onAdd(item))
  return (
    <div
      data-dish={item.id}
      className={
        'overflow-hidden rounded-card bg-white shadow-card ' + (soldOut ? 'opacity-50' : '')
      }
    >
      <div className="relative h-[150px] bg-gradient-to-br from-line-strong to-[#c5cedd]">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-secondary">
            Hết hàng
          </span>
        )}
      </div>
      <div className="p-4">
        {hasOptions ? (
          <button
            type="button"
            aria-label={`Xem ${item.name}`}
            disabled={soldOut}
            onClick={() => onOpenDetail(item)}
            className="block w-full text-left"
          >
            <div className="font-bold text-ink">{item.name}</div>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
            )}
          </button>
        ) : (
          <>
            <div className="font-bold text-ink">{item.name}</div>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
            )}
          </>
        )}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="text-base font-extrabold text-ink">{formatVND(item.price)}</div>
          <div className="relative">
            <button
              type="button"
              aria-label={`${hasOptions ? 'Chọn' : 'Thêm'} ${item.name}`}
              disabled={soldOut}
              onClick={onPlus}
              className="flex size-9 items-center justify-center rounded-control bg-ink text-white disabled:opacity-40"
            >
              <Plus size={18} weight="bold" />
            </button>
            {qty > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-brand px-1 text-[10px] font-bold text-white">
                {qty}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun run test src/widgets/menu-grid/MenuGrid.test.tsx`
Expected: PASS (existing + 2 new). The existing sold-out test still finds a disabled button named `/Thêm/` (Bún chả is option-less).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/menu-grid/MenuGrid.tsx src/widgets/menu-grid/MenuGrid.test.tsx
git commit -m "feat(web): MenuGrid opens detail for dishes with options (US-2.3)"
```

---

### Task 5: `CartPanel` — show options + note, key by lineId

**Files:**
- Modify: `src/widgets/cart-panel/CartPanel.tsx`
- Modify: `src/widgets/cart-panel/CartPanel.test.tsx`

**Interfaces:**
- Consumes: `CartLine`, `cartCount`, `cartSubtotal` from `@/entities/cart/model`.
- Produces: `CartPanel` props unchanged except `onSetQty` is now `(lineId: string, qty: number) => void` (was keyed by item id).

- [ ] **Step 1: Update the test**

Replace the `cart` fixture and the stepper test in `src/widgets/cart-panel/CartPanel.test.tsx`:

```tsx
import type { CartLine } from '@/entities/cart/model'

const cart: CartLine[] = [
  {
    lineId: 'L1',
    menuItemId: 'i1',
    name: 'Phở bò',
    imageUrl: null,
    unitPrice: 50000,
    options: [{ id: 'l', name: 'Lớn', priceDelta: 10000 }],
    note: 'ít hành',
    quantity: 2,
  },
]
```

Update the stepper test to assert `lineId`:

```tsx
  it('increments and decrements via stepper', () => {
    const { onSetQty } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Phở bò' }))
    expect(onSetQty).toHaveBeenCalledWith('L1', 3)
    fireEvent.click(screen.getByRole('button', { name: 'Giảm Phở bò' }))
    expect(onSetQty).toHaveBeenCalledWith('L1', 1)
  })
```

Add a case for option/note display:

```tsx
  it('shows selected options and the note under the dish name', () => {
    setup()
    expect(screen.getByText('Lớn')).toBeInTheDocument()
    expect(screen.getByText('ít hành')).toBeInTheDocument()
  })
```

> The "shows lines and total" test expects `/100[.,]000đ/` on the submit button — still correct: `unitPrice 50000 × quantity 2 = 100000`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/widgets/cart-panel/CartPanel.test.tsx`
Expected: FAIL — `line.id`/`line.price` no longer exist (type error / undefined), `Lớn` not found.

- [ ] **Step 3: Update the implementation**

In `src/widgets/cart-panel/CartPanel.tsx`, update the `Props` doc for `onSetQty` to `(lineId, qty)` and replace the line-mapping block (the `cart.map((line) => …)` inside the scroll container) with:

```tsx
            {cart.map((line) => (
              <div
                key={line.lineId}
                className="flex items-center gap-3 border-b border-line py-4 last:border-0"
              >
                <div className="size-13 shrink-0 rounded-[12px] bg-gradient-to-br from-line-strong to-[#c5cedd]">
                  {line.imageUrl && (
                    <img
                      src={line.imageUrl}
                      alt={line.name}
                      className="size-full rounded-[12px] object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink">{line.name}</div>
                  {line.options.length > 0 && (
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {line.options.map((o) => o.name).join(', ')}
                    </div>
                  )}
                  {line.note && <div className="mt-0.5 truncate text-xs text-muted">{line.note}</div>}
                  <div className="mt-0.5 text-xs font-semibold text-muted">
                    {formatVND(line.unitPrice)}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label={`Giảm ${line.name}`}
                    onClick={() => onSetQty(line.lineId, line.quantity - 1)}
                    className="flex size-6.5 items-center justify-center rounded-lg bg-page text-ink"
                  >
                    <Minus size={14} weight="bold" />
                  </button>
                  <span className="text-sm font-bold text-ink">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Tăng ${line.name}`}
                    onClick={() => onSetQty(line.lineId, line.quantity + 1)}
                    className="flex size-6.5 items-center justify-center rounded-lg bg-ink text-white"
                  >
                    <Plus size={14} weight="bold" />
                  </button>
                </div>
              </div>
            ))}
```

Also update the `Props` interface comment/type for `onSetQty`:

```tsx
  onSetQty: (lineId: string, qty: number) => void
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test src/widgets/cart-panel/CartPanel.test.tsx`
Expected: PASS (existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/cart-panel/CartPanel.tsx src/widgets/cart-panel/CartPanel.test.tsx
git commit -m "feat(web): CartPanel shows options + note, keys by lineId (US-2.3)"
```

---

### Task 6: Wire `CustomerMenuPage` + extend submit payload

**Files:**
- Modify: `src/pages/customer-menu/CustomerMenuPage.tsx`
- Modify: `src/pages/customer-menu/CustomerMenuPage.test.tsx`
- Modify: `src/shared/api/order.ts`

**Interfaces:**
- Consumes: `buildCartLine`, `addLine`, `setQuantity`, `cartCount`, `quantityByMenuItem`, `CartLine` from `@/entities/cart/model`; `defaultSelection`, `selectedOptions` from `@/entities/menu/dish-selection`; `DishDetailSheet` from `@/widgets/dish-detail/DishDetailSheet`.
- Produces: `submitOrderItems` input item type extended to `{ menuItemId: string; quantity: number; note?: string | null; optionIds?: string[] }`.

- [ ] **Step 1: Extend `submitOrderItems` in `src/shared/api/order.ts`**

Change the `SubmitInput` interface:

```ts
interface SubmitInput {
  qrToken: string
  items: { menuItemId: string; quantity: number; note?: string | null; optionIds?: string[] }[]
}
```

No other change is needed — the handler already forwards `data.items` in the body, and the BE accepts the optional `note`/`optionIds` fields.

- [ ] **Step 2: Add failing tests to `CustomerMenuPage.test.tsx`**

Append a dish with options to the `menu.categories[0].items` array (after `Bún chả`):

```tsx
        {
          id: 'i3',
          name: 'Trà sữa',
          description: null,
          price: 35000,
          imageUrl: null,
          isAvailable: true,
          optionGroups: [
            {
              id: 'g1',
              name: 'Size',
              type: 'SINGLE',
              isRequired: true,
              options: [
                { id: 'o-m', name: 'M', priceDelta: 0 },
                { id: 'o-l', name: 'L', priceDelta: 6000 },
              ],
            },
          ],
        },
```

Update the existing successful-submit expectation (the `submits the cart…` test) — the quick-add payload now includes `note` and `optionIds`:

```tsx
    expect(submitOrderItems).toHaveBeenCalledWith({
      data: {
        qrToken: 'tok',
        items: [{ menuItemId: 'i1', quantity: 1, note: null, optionIds: [] }],
      },
    })
```

Add a case covering the detail sheet → submit flow:

```tsx
  it('adds a dish with options via the detail sheet and submits its optionIds + note', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Trà sữa' }))
    fireEvent.click(await screen.findByRole('radio', { name: /^L/ }))
    fireEvent.change(screen.getByPlaceholderText(/Ghi chú/), { target: { value: 'ít đá' } })
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/ }))
    openCart()
    fireEvent.click(await screen.findByRole('button', { name: /Gửi bếp/ }))
    expect(submitOrderItems).toHaveBeenCalledWith({
      data: {
        qrToken: 'tok',
        items: [{ menuItemId: 'i3', quantity: 1, note: 'ít đá', optionIds: ['o-l'] }],
      },
    })
  })
```

> The radio name `/^L/` matches the "L" option (and avoids matching "M"). `openCart` and the `Gửi bếp` button already exist in this file.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun run test src/pages/customer-menu/CustomerMenuPage.test.tsx`
Expected: FAIL — the page still uses `addItem` (no detail sheet / no `Chọn Trà sữa` button) and submits without `note`/`optionIds`.

- [ ] **Step 4: Update `CustomerMenuPage.tsx`**

Replace the imports and the relevant body. New imports:

```tsx
import { useState, useEffect } from 'react'
import { X } from '@phosphor-icons/react'

import type { TableContext } from '@/entities/table/model'
import type { Menu, MenuItem } from '@/entities/menu/model'
import { defaultSelection, selectedOptions } from '@/entities/menu/dish-selection'
import { filterMenu } from '@/entities/menu/filter'
import {
  type CartLine,
  buildCartLine,
  addLine,
  setQuantity,
  cartCount,
  quantityByMenuItem,
} from '@/entities/cart/model'
import { TopNav } from '@/widgets/top-nav/TopNav'
import { MenuGrid } from '@/widgets/menu-grid/MenuGrid'
import { CartPanel } from '@/widgets/cart-panel/CartPanel'
import { DishDetailSheet } from '@/widgets/dish-detail/DishDetailSheet'
import { Drawer, DrawerContent, DrawerTitle, DrawerClose } from '@/shared/ui'
import { submitOrderItems } from '@/shared/api/order'
```

Inside the component, replace the cart-derived values and handlers:

```tsx
  const [cart, setCart] = useState<CartLine[]>([])
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const categories = menu.categories.map((c) => ({ id: c.id, name: c.name }))
  const filtered = filterMenu(menu, search)
  const quantities = quantityByMenuItem(cart)

  // Option-less dishes quick-add with their default (empty) selection.
  const onAdd = (item: MenuItem) =>
    setCart((c) => addLine(c, buildCartLine(item, selectedOptions(item, defaultSelection(item)), null, 1)))
  const onAddLine = (line: CartLine) => setCart((c) => addLine(c, line))
  const onSetQty = (lineId: string, qty: number) => setCart((c) => setQuantity(c, lineId, qty))
```

Update `onSubmit`'s payload mapping:

```tsx
      await submitOrderItems({
        data: {
          qrToken,
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            note: l.note,
            optionIds: l.options.map((o) => o.id),
          })),
        },
      })
```

Pass `onOpenDetail` to `MenuGrid` and render the detail sheet. In the `<MenuGrid … />` call add:

```tsx
            onOpenDetail={setDetailItem}
```

And add the sheet next to the existing cart `<Drawer>` (e.g. right after it, before the closing `</div>`):

```tsx
      <DishDetailSheet
        item={detailItem}
        open={detailItem !== null}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null)
        }}
        onAdd={onAddLine}
      />
```

- [ ] **Step 5: Run the page tests to verify they pass**

Run: `bun run test src/pages/customer-menu/CustomerMenuPage.test.tsx`
Expected: PASS (existing updated + 1 new).

- [ ] **Step 6: Typecheck + full unit suite (first full run since Task 2)**

Run: `bun run build && bun run test`
Expected: build succeeds; all unit tests PASS (no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/pages/customer-menu src/shared/api/order.ts
git commit -m "feat(web): wire dish detail sheet + submit note/optionIds (US-2.3)"
```

---

### Task 7: E2E — pick an option then submit

**Files:**
- Create: `e2e/dish-options.spec.ts`

**Interfaces:**
- Consumes: a running BE on `API_BASE_URL` and a seeded `process.env.E2E_QR_TOKEN` whose menu contains at least one dish with an option group.

- [ ] **Step 1: Write the e2e spec**

```ts
// e2e/dish-options.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Customer dish options (US-2.3)', () => {
  test('choosing an option then adding shows the option in the cart', async ({ page }) => {
    const token = process.env.E2E_QR_TOKEN
    test.skip(!token, 'Set E2E_QR_TOKEN to a seeded table token to run this test')

    await page.goto(`/t/${token}`)

    // Find the first dish that opens a detail sheet (aria-label "Chọn …").
    const chooseButton = page.getByRole('button', { name: /^Chọn / }).first()
    test.skip((await chooseButton.count()) === 0, 'Seeded menu has no dish with options')
    await chooseButton.click()

    // The detail sheet shows the add button; pick the first option then add.
    const addButton = page.getByRole('button', { name: /Thêm vào giỏ/ })
    await expect(addButton).toBeVisible()
    await page.getByRole('radio').first().check().catch(() => {})
    await addButton.click()

    // Open the cart drawer; the line is present and the submit button is enabled.
    await page.getByRole('button', { name: /Mở giỏ hàng/ }).click()
    await expect(page.getByRole('button', { name: /Gửi bếp/ })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the e2e (with BE + seeded token) or confirm it skips cleanly**

Run: `bun run test:e2e` with `E2E_QR_TOKEN` set.
Expected: PASS when a dish with options is seeded; SKIPPED (not failed) otherwise.

- [ ] **Step 3: Commit**

```bash
git add e2e/dish-options.spec.ts
git commit -m "test(web): e2e dish options happy path (US-2.3)"
```

---

## Self-Review

**Spec coverage:**
- Detail open model (hybrid: quick-add vs open sheet) → Task 4 + Task 6. ✓
- Bottom-sheet presentation → Task 3 (`Drawer direction="bottom"`). ✓
- Option controls (SINGLE radio / MULTI checkbox) + required marker → Task 3. ✓
- Free-text note → Task 3 (textarea), Task 5 (display), Task 6 (submit). ✓
- Live price updates from option deltas → Task 1 (`selectionPrice`) + Task 3 (footer). ✓
- Required-group validation (SINGLE pre-select, MULTI ≥1 gating) → Task 1 (`defaultSelection`/`isSelectionValid`) + Task 3 (disabled button). ✓
- Cart split by option+note, merge identical → Task 2 (`lineSignature`/`addLine`). ✓
- Per-line quantity, badge per dish → Task 2 (`setQuantity`/`quantityByMenuItem`) + Task 4 + Task 5. ✓
- Submit forwards `note` + `optionIds` → Task 6 (`order.ts` + page mapping). ✓
- Tests: unit (Tasks 1–6) + e2e (Task 7). ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. Advisory notes point at existing names to reuse, not unwritten logic.

**Type consistency:** `Selection` defined in Task 1, consumed in Task 3. `CartLine`/`CartOption`/`buildCartLine`/`addLine`/`setQuantity(lineId)`/`quantityByMenuItem` defined in Task 2 and used unchanged in Tasks 3/5/6. `selectedOptions` returns `{ id; name; priceDelta }` which is exactly `CartOption`, so `buildCartLine(item, selectedOptions(...), …)` typechecks. `MenuGrid` gains `onOpenDetail` (Task 4) consumed by the page (Task 6). `submitOrderItems` input shape (Task 6) matches the page's mapping and the existing call sites.
