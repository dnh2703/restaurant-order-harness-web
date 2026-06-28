# Web Customer Ordering — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the customer QR-ordering web screen (menu + cart) to match the
`App Khách - Gọi món QR (Web)` handoff design, responsive, wired to the Elysia BE.

**Architecture:** TanStack Start route `/t/$qrToken` loads table context + menu
server-side (already exists). A responsive `CustomerMenuPage` composes three new
widgets — `top-nav`, `menu-grid`, `cart-panel`. Search/category state lives in
URL search params; cart state lives in page React state; "Gửi bếp" posts to the
BE via a new server function. Pure logic (diacritics, filtering, cart math,
formatting) lives in tested `shared/lib` + `entities/cart` modules.

**Tech Stack:** React 19, TanStack Start/Router, Tailwind CSS v4, Vitest +
Testing Library, Playwright, Bun.

## Global Constraints

- FSD layers: `app / pages / widgets / features / entities / shared`. Import
  direction points downward only (e.g. widgets may import entities/shared, never
  pages).
- Path alias `@/` → `src/`.
- Money is an integer VND amount; display via `formatVND` → `"159.000đ"`.
- Design tokens (from spec `2026-06-28-web-customer-ordering-design.md`): ink
  `#102A43`, blue `#2563EB`, blue-bg `#E8F0FE`, page bg `#F1F4F9`, card `#fff`,
  border `#E6EAF1`/`#EEF1F6`, muted `#8A8E99`, secondary `#4F535D`. Radii: card
  18px, control 12px, button 14px. Font: Be Vietnam Pro. Never hardcode hex in
  components — use the Tailwind theme tokens defined in Task 1.
- Responsive: `≥ lg` two columns (menu + sticky 360px cart); `< lg` one column +
  mobile cart bottom-bar/sheet.
- Verify command: `bun run validate` (`tsc --noEmit && vitest run`). E2E:
  `bun run test:e2e`.
- TDD: failing test first; commit after each green task.

---

### Task 1: Design tokens, font, and price format

**Files:**
- Modify: `src/styles.css`
- Modify: `src/routes/__root.tsx` (font `<link>` in head)
- Modify: `src/shared/lib/format.ts`
- Test: `src/shared/lib/format.test.ts` (existing)

**Interfaces:**
- Produces: `formatVND(amount: number): string` returning grouped digits + `"đ"`
  (e.g. `formatVND(159000) === "159.000đ"`). `toNumber` unchanged.

- [ ] **Step 1: Update the failing test for the new format**

In `src/shared/lib/format.test.ts`, replace the `formatVND` describe block with:

```ts
describe('formatVND', () => {
  it('groups thousands and appends đ with no space', () => {
    expect(formatVND(159000)).toBe('159.000đ')
  })
  it('formats zero', () => {
    expect(formatVND(0)).toBe('0đ')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- format`
Expected: FAIL (current `formatVND` returns the `₫` currency style).

- [ ] **Step 3: Implement the new formatter**

Replace `formatVND` in `src/shared/lib/format.ts` with:

```ts
/** Format a VND integer amount as the design's "159.000đ" style. */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}
```

- [ ] **Step 4: Add design tokens + font**

Replace `src/styles.css` with:

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Be Vietnam Pro', system-ui, sans-serif;

  --color-ink: #102a43;
  --color-ink-soft: #2e3038;
  --color-brand: #2563eb;
  --color-brand-bg: #e8f0fe;
  --color-brand-border: #cfe0fb;
  --color-page: #f1f4f9;
  --color-line: #eef1f6;
  --color-line-strong: #e6eaf1;
  --color-muted: #8a8e99;
  --color-secondary: #4f535d;
  --color-ok-bg: #e9f0e4;
  --color-ok-text: #5b7a3e;

  --radius-card: 18px;
  --radius-control: 12px;
  --radius-button: 14px;

  --shadow-card: 0 12px 30px -22px rgba(16, 42, 67, 0.4);
  --shadow-panel: 0 40px 90px -34px rgba(16, 42, 67, 0.45);
}

body {
  background: var(--color-page);
  font-family: var(--font-sans);
  color: var(--color-ink);
}
```

In `src/routes/__root.tsx`, add to the document `<head>` (alongside existing
head links) the Be Vietnam Pro stylesheet:

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link
  href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

(If `__root.tsx` defines head links via `head: () => ({ links: [...] })`, add
the three links there instead, matching the existing pattern.)

- [ ] **Step 5: Run tests + typecheck**

Run: `bun run validate`
Expected: PASS (format tests green; MenuList test still matches `/50[.,]000/`).

- [ ] **Step 6: Commit**

```bash
git add src/styles.css src/routes/__root.tsx src/shared/lib/format.ts src/shared/lib/format.test.ts
git commit -m "feat(web): add design tokens, Be Vietnam Pro, đ price format"
```

---

### Task 2: Diacritic-insensitive search helper

**Files:**
- Create: `src/shared/lib/diacritics.ts`
- Test: `src/shared/lib/diacritics.test.ts`

**Interfaces:**
- Produces: `normalizeVN(s: string): string` — lowercased, diacritics stripped,
  `đ`→`d`. `matchesQuery(haystack: string, query: string): boolean` — true when
  normalized query is empty or is a substring of normalized haystack.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { normalizeVN, matchesQuery } from './diacritics'

describe('normalizeVN', () => {
  it('strips Vietnamese diacritics and lowercases', () => {
    expect(normalizeVN('Phở Bò')).toBe('pho bo')
  })
  it('maps đ/Đ to d', () => {
    expect(normalizeVN('Đậu')).toBe('dau')
  })
})

describe('matchesQuery', () => {
  it('matches ignoring diacritics and case', () => {
    expect(matchesQuery('Phở bò tái', 'pho')).toBe(true)
    expect(matchesQuery('Phở bò tái', 'BO')).toBe(true)
  })
  it('returns true for empty query', () => {
    expect(matchesQuery('anything', '')).toBe(true)
    expect(matchesQuery('anything', '   ')).toBe(true)
  })
  it('returns false when not found', () => {
    expect(matchesQuery('Phở bò', 'lau')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- diacritics`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
/** Lowercase, strip Vietnamese diacritics, map đ→d for accent-insensitive search. */
export function normalizeVN(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
}

/** True when `query` (normalized) is empty or a substring of `haystack` (normalized). */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeVN(query)
  if (q === '') return true
  return normalizeVN(haystack).includes(q)
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `bun run test:unit -- diacritics`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/diacritics.ts src/shared/lib/diacritics.test.ts
git commit -m "feat(web): add VN diacritic-insensitive search helpers"
```

---

### Task 3: Menu filtering logic

**Files:**
- Create: `src/entities/menu/filter.ts`
- Test: `src/entities/menu/filter.test.ts`

**Interfaces:**
- Consumes: `Menu`, `MenuCategory` from `@/entities/menu/model`; `matchesQuery`
  from `@/shared/lib/diacritics`.
- Produces:
  - `filterMenu(menu: Menu, opts: { q: string; cat: string }): Menu` — `cat`
    `'all'` keeps all categories, else keeps only the category whose `id===cat`;
    within kept categories, keeps items whose `name` matchesQuery `q`; drops
    categories that become empty.
  - `countItems(menu: Menu): number` — total items across categories.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { filterMenu, countItems } from './filter'
import type { Menu } from './model'

const menu: Menu = {
  categories: [
    { id: 'c1', name: 'Khai vị', items: [
      { id: 'i1', name: 'Gỏi cuốn', description: null, price: 45000, imageUrl: null, isAvailable: true, optionGroups: [] },
    ]},
    { id: 'c2', name: 'Món chính', items: [
      { id: 'i2', name: 'Phở bò', description: null, price: 50000, imageUrl: null, isAvailable: true, optionGroups: [] },
      { id: 'i3', name: 'Bún chả', description: null, price: 45000, imageUrl: null, isAvailable: false, optionGroups: [] },
    ]},
  ],
}

describe('countItems', () => {
  it('counts items across categories', () => {
    expect(countItems(menu)).toBe(3)
  })
})

describe('filterMenu', () => {
  it('returns all when q empty and cat all', () => {
    expect(countItems(filterMenu(menu, { q: '', cat: 'all' }))).toBe(3)
  })
  it('filters by category id', () => {
    const r = filterMenu(menu, { q: '', cat: 'c1' })
    expect(r.categories).toHaveLength(1)
    expect(r.categories[0].id).toBe('c1')
  })
  it('filters by name diacritic-insensitive and drops empty categories', () => {
    const r = filterMenu(menu, { q: 'pho', cat: 'all' })
    expect(countItems(r)).toBe(1)
    expect(r.categories).toHaveLength(1)
    expect(r.categories[0].items[0].name).toBe('Phở bò')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- menu/filter`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { Menu } from './model'
import { matchesQuery } from '@/shared/lib/diacritics'

export function countItems(menu: Menu): number {
  return menu.categories.reduce((n, c) => n + c.items.length, 0)
}

export function filterMenu(menu: Menu, opts: { q: string; cat: string }): Menu {
  const categories = menu.categories
    .filter((c) => opts.cat === 'all' || c.id === opts.cat)
    .map((c) => ({ ...c, items: c.items.filter((i) => matchesQuery(i.name, opts.q)) }))
    .filter((c) => c.items.length > 0)
  return { categories }
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `bun run test:unit -- menu/filter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/menu/filter.ts src/entities/menu/filter.test.ts
git commit -m "feat(web): add menu filter + count logic (US-2.2)"
```

---

### Task 4: Cart entity model

**Files:**
- Create: `src/entities/cart/model.ts`
- Test: `src/entities/cart/model.test.ts`

**Interfaces:**
- Consumes: `MenuItem` from `@/entities/menu/model`.
- Produces:
  - type `CartLine = { id: string; name: string; price: number; imageUrl: string | null; quantity: number }`
  - `addItem(cart: CartLine[], item: MenuItem): CartLine[]` — increments if
    present (by `id`), else appends qty 1.
  - `setQuantity(cart: CartLine[], id: string, qty: number): CartLine[]` — qty
    `<= 0` removes the line; else sets it.
  - `cartCount(cart: CartLine[]): number` — sum of quantities.
  - `cartSubtotal(cart: CartLine[]): number` — sum of `price * quantity`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { addItem, setQuantity, cartCount, cartSubtotal, type CartLine } from './model'
import type { MenuItem } from '@/entities/menu/model'

const dish = (id: string, price: number): MenuItem => ({
  id, name: `Dish ${id}`, description: null, price, imageUrl: null, isAvailable: true, optionGroups: [],
})

describe('cart model', () => {
  it('adds a new line at quantity 1', () => {
    const c = addItem([], dish('a', 50000))
    expect(c).toHaveLength(1)
    expect(c[0]).toMatchObject({ id: 'a', quantity: 1, price: 50000 })
  })
  it('increments an existing line', () => {
    const c = addItem(addItem([], dish('a', 50000)), dish('a', 50000))
    expect(c).toHaveLength(1)
    expect(c[0].quantity).toBe(2)
  })
  it('setQuantity updates and removes at <= 0', () => {
    let c = addItem([], dish('a', 50000))
    c = setQuantity(c, 'a', 3)
    expect(c[0].quantity).toBe(3)
    c = setQuantity(c, 'a', 0)
    expect(c).toHaveLength(0)
  })
  it('computes count and subtotal', () => {
    let c = addItem([], dish('a', 50000))
    c = addItem(c, dish('b', 30000))
    c = setQuantity(c, 'a', 2)
    expect(cartCount(c)).toBe(3)
    expect(cartSubtotal(c)).toBe(130000)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- cart/model`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { MenuItem } from '@/entities/menu/model'

export interface CartLine {
  id: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

export function addItem(cart: CartLine[], item: MenuItem): CartLine[] {
  if (cart.some((l) => l.id === item.id)) {
    return cart.map((l) => (l.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
  }
  return [
    ...cart,
    { id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, quantity: 1 },
  ]
}

export function setQuantity(cart: CartLine[], id: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => l.id !== id)
  return cart.map((l) => (l.id === id ? { ...l, quantity: qty } : l))
}

export function cartCount(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.quantity, 0)
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.price * l.quantity, 0)
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `bun run test:unit -- cart/model`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/cart/model.ts src/entities/cart/model.test.ts
git commit -m "feat(web): add cart entity model + math (US-3.1)"
```

---

### Task 5: TopNav widget

**Files:**
- Create: `src/widgets/top-nav/TopNav.tsx`
- Test: `src/widgets/top-nav/TopNav.test.tsx`

**Interfaces:**
- Consumes: `Restaurant`, `TableInfo` from `@/entities/table/model`.
- Produces: `TopNav` component:
  ```ts
  function TopNav(props: {
    restaurant: Restaurant
    table: TableInfo
    query: string
    onQueryChange: (q: string) => void
  }): JSX.Element
  ```
  Renders a sticky bar: square logo (first letter of restaurant name), restaurant
  name, a search `<input placeholder="Tìm món…">` bound to `query`/`onQueryChange`
  (role `searchbox`), and a table badge showing `table.name` uppercased.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopNav } from './TopNav'

const restaurant = { name: 'Bếp Mộc' }
const table = { id: 't1', name: 'Bàn 12', status: 'OCCUPIED' as const }

describe('TopNav', () => {
  it('shows restaurant and table', () => {
    render(<TopNav restaurant={restaurant} table={table} query="" onQueryChange={() => {}} />)
    expect(screen.getByText('Bếp Mộc')).toBeInTheDocument()
    expect(screen.getByText(/Bàn 12/i)).toBeInTheDocument()
  })
  it('emits query changes from the search box', () => {
    const onQueryChange = vi.fn()
    render(<TopNav restaurant={restaurant} table={table} query="" onQueryChange={onQueryChange} />)
    fireEvent.change(screen.getByPlaceholderText('Tìm món…'), { target: { value: 'pho' } })
    expect(onQueryChange).toHaveBeenCalledWith('pho')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- top-nav`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
import type { Restaurant, TableInfo } from '@/entities/table/model'

interface Props {
  restaurant: Restaurant
  table: TableInfo
  query: string
  onQueryChange: (q: string) => void
}

export function TopNav({ restaurant, table, query, onQueryChange }: Props) {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex items-center gap-3.5">
        <div className="flex size-10 items-center justify-center rounded-[12px] bg-ink text-lg font-extrabold text-white">
          {restaurant.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-lg font-extrabold leading-none tracking-tight text-ink">
          {restaurant.name}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex h-10 flex-1 items-center gap-2 rounded-[11px] bg-page px-3.5 sm:w-72">
          <span aria-hidden className="text-muted">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Tìm món…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
        <span className="flex h-10 shrink-0 items-center gap-2 rounded-[11px] border border-brand-border bg-brand-bg px-3.5 text-xs font-bold uppercase text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          {table.name}
        </span>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `bun run test:unit -- top-nav`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/top-nav
git commit -m "feat(web): add TopNav widget (logo, search, table badge)"
```

---

### Task 6: MenuGrid widget (chips + dish cards)

**Files:**
- Create: `src/widgets/menu-grid/MenuGrid.tsx`
- Test: `src/widgets/menu-grid/MenuGrid.test.tsx`

**Interfaces:**
- Consumes: `Menu`, `MenuItem` from `@/entities/menu/model`; `countItems` from
  `@/entities/menu/filter`; `formatVND` from `@/shared/lib/format`.
- Produces: `MenuGrid` component:
  ```ts
  function MenuGrid(props: {
    menu: Menu                 // already-filtered menu to render
    categories: { id: string; name: string }[] // full category list for chips
    activeCat: string          // 'all' | categoryId
    onSelectCat: (cat: string) => void
    quantities: Record<string, number> // menuItemId -> qty in cart (for badge)
    onAdd: (item: MenuItem) => void
  }): JSX.Element
  ```
  Renders: chip row (`Tất cả` + each category, active chip styled ink/white),
  section header (active category name or `Tất cả` + `· N món` via
  `countItems(menu)`), and a responsive dish-card grid
  (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Sold-out items
  (`!isAvailable`) are dimmed, show a `Hết hàng` label, and the `+` button is
  disabled. The `+` button shows a quantity badge when `quantities[item.id] > 0`.
  Empty state: `Không tìm thấy món phù hợp.`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MenuGrid } from './MenuGrid'
import type { Menu } from '@/entities/menu/model'

const menu: Menu = {
  categories: [{ id: 'c1', name: 'Món chính', items: [
    { id: 'i1', name: 'Phở bò', description: 'Truyền thống', price: 50000, imageUrl: null, isAvailable: true, optionGroups: [] },
    { id: 'i2', name: 'Bún chả', description: null, price: 45000, imageUrl: null, isAvailable: false, optionGroups: [] },
  ]}],
}
const cats = [{ id: 'c1', name: 'Món chính' }]

function setup(over = {}) {
  const props = { menu, categories: cats, activeCat: 'all', onSelectCat: vi.fn(), quantities: {}, onAdd: vi.fn(), ...over }
  render(<MenuGrid {...props} />)
  return props
}

describe('MenuGrid', () => {
  it('renders dishes with formatted price and a chip per category plus Tất cả', () => {
    setup()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText(/50[.,]000đ/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Món chính' })).toBeInTheDocument()
  })
  it('marks sold-out dishes and disables their add button', () => {
    setup()
    expect(screen.getByText('Hết hàng')).toBeInTheDocument()
    const addButtons = screen.getAllByRole('button', { name: /Thêm/ })
    // Bún chả's add button is disabled.
    expect(addButtons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })
  it('calls onAdd for an available dish', () => {
    const { onAdd } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }))
  })
  it('selecting a chip calls onSelectCat', () => {
    const { onSelectCat } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Món chính' }))
    expect(onSelectCat).toHaveBeenCalledWith('c1')
  })
  it('shows empty state when no items', () => {
    setup({ menu: { categories: [] } })
    expect(screen.getByText(/Không tìm thấy/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- menu-grid`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
import type { Menu, MenuItem } from '@/entities/menu/model'
import { countItems } from '@/entities/menu/filter'
import { formatVND } from '@/shared/lib/format'

interface Props {
  menu: Menu
  categories: { id: string; name: string }[]
  activeCat: string
  onSelectCat: (cat: string) => void
  quantities: Record<string, number>
  onAdd: (item: MenuItem) => void
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-[12px] px-4 py-2.5 text-sm font-semibold whitespace-nowrap ' +
        (active ? 'bg-ink text-white' : 'border border-line-strong bg-white text-secondary')
      }
    >
      {label}
    </button>
  )
}

function DishCard({ item, qty, onAdd }: { item: MenuItem; qty: number; onAdd: (i: MenuItem) => void }) {
  const soldOut = !item.isAvailable
  return (
    <div className={'overflow-hidden rounded-card bg-white shadow-card ' + (soldOut ? 'opacity-50' : '')}>
      <div className="relative h-[150px] bg-gradient-to-br from-line-strong to-[#c5cedd]">
        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-secondary">
            Hết hàng
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="font-bold text-ink">{item.name}</div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
        )}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="text-base font-extrabold text-ink">{formatVND(item.price)}</div>
          <div className="relative">
            <button
              type="button"
              aria-label={`Thêm ${item.name}`}
              disabled={soldOut}
              onClick={() => onAdd(item)}
              className="flex size-9 items-center justify-center rounded-[12px] bg-ink text-xl font-light text-white disabled:opacity-40"
            >
              +
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

export function MenuGrid({ menu, categories, activeCat, onSelectCat, quantities, onAdd }: Props) {
  const activeName = activeCat === 'all' ? 'Tất cả' : (categories.find((c) => c.id === activeCat)?.name ?? 'Tất cả')
  const total = countItems(menu)
  return (
    <div>
      <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
        <Chip label="Tất cả" active={activeCat === 'all'} onClick={() => onSelectCat('all')} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} active={activeCat === c.id} onClick={() => onSelectCat(c.id)} />
        ))}
      </div>
      <div className="mt-7 flex items-baseline justify-between">
        <div className="text-lg font-extrabold text-ink">{activeName}</div>
        <div className="text-xs text-muted">{total} món</div>
      </div>
      {total === 0 ? (
        <p className="py-12 text-center text-muted">Không tìm thấy món phù hợp.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {menu.categories.map((cat) => (
            <section key={cat.id}>
              {activeCat === 'all' && (
                <h2 className="mb-3 text-base font-bold text-ink">{cat.name}</h2>
              )}
              <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((item) => (
                  <DishCard key={item.id} item={item} qty={quantities[item.id] ?? 0} onAdd={onAdd} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
```

(If Tailwind rejects `gap-4.5`, use `gap-4`. Add a `.scrollbar-none` utility in
`styles.css`: `.scrollbar-none{scrollbar-width:none}.scrollbar-none::-webkit-scrollbar{display:none}`.)

- [ ] **Step 4: Run it to confirm it passes**

Run: `bun run test:unit -- menu-grid`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/menu-grid src/styles.css
git commit -m "feat(web): add MenuGrid widget (chips, cards, sold-out, badge)"
```

---

### Task 7: CartPanel widget

**Files:**
- Create: `src/widgets/cart-panel/CartPanel.tsx`
- Test: `src/widgets/cart-panel/CartPanel.test.tsx`

**Interfaces:**
- Consumes: `CartLine`, `cartCount`, `cartSubtotal` from `@/entities/cart/model`;
  `formatVND` from `@/shared/lib/format`.
- Produces: `CartPanel` component:
  ```ts
  function CartPanel(props: {
    cart: CartLine[]
    onSetQty: (id: string, qty: number) => void
    onSubmit: () => void
    submitting: boolean
    error: string | null
  }): JSX.Element
  ```
  Header `Giỏ của bạn` + count badge. Empty state when cart empty (and submit
  button hidden/disabled). Each line: thumb, name, line price `formatVND(price)`,
  `− qty +` stepper (− calls `onSetQty(id, qty-1)`, + calls `onSetQty(id, qty+1)`).
  Discount-code input rendered **disabled** (visual only). Footer: subtotal,
  total = subtotal (no discount in P1), and a `Gửi bếp · <total>` button that
  calls `onSubmit`, disabled when empty or `submitting`. Shows `error` if set.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartPanel } from './CartPanel'
import type { CartLine } from '@/entities/cart/model'

const cart: CartLine[] = [
  { id: 'i1', name: 'Phở bò', price: 50000, imageUrl: null, quantity: 2 },
]

function setup(over = {}) {
  const props = { cart, onSetQty: vi.fn(), onSubmit: vi.fn(), submitting: false, error: null, ...over }
  render(<CartPanel {...props} />)
  return props
}

describe('CartPanel', () => {
  it('shows lines and total (subtotal)', () => {
    setup()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gửi bếp/ })).toHaveTextContent(/100[.,]000đ/)
  })
  it('increments and decrements via stepper', () => {
    const { onSetQty } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Phở bò' }))
    expect(onSetQty).toHaveBeenCalledWith('i1', 3)
    fireEvent.click(screen.getByRole('button', { name: 'Giảm Phở bò' }))
    expect(onSetQty).toHaveBeenCalledWith('i1', 1)
  })
  it('submits the order', () => {
    const { onSubmit } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Gửi bếp/ }))
    expect(onSubmit).toHaveBeenCalled()
  })
  it('shows an empty state and no submit when cart empty', () => {
    setup({ cart: [] })
    expect(screen.getByText(/Giỏ hàng trống/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gửi bếp/ })).not.toBeInTheDocument()
  })
  it('shows an error message', () => {
    setup({ error: 'Lỗi gửi đơn' })
    expect(screen.getByText('Lỗi gửi đơn')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- cart-panel`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
import { type CartLine, cartCount, cartSubtotal } from '@/entities/cart/model'
import { formatVND } from '@/shared/lib/format'

interface Props {
  cart: CartLine[]
  onSetQty: (id: string, qty: number) => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}

export function CartPanel({ cart, onSetQty, onSubmit, submitting, error }: Props) {
  const count = cartCount(cart)
  const subtotal = cartSubtotal(cart)
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <div className="text-lg font-extrabold text-ink">Giỏ của bạn</div>
        <div className="rounded-lg bg-brand-bg px-2.5 py-1 text-xs font-semibold text-brand">{count} món</div>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-muted">
          Giỏ hàng trống. Chọn món để bắt đầu.
        </div>
      ) : (
        <>
          <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-4">
            {cart.map((line) => (
              <div key={line.id} className="flex items-center gap-3 border-b border-line py-4 last:border-0">
                <div className="size-13 shrink-0 rounded-[12px] bg-gradient-to-br from-line-strong to-[#c5cedd]">
                  {line.imageUrl && <img src={line.imageUrl} alt={line.name} className="size-full rounded-[12px] object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink">{line.name}</div>
                  <div className="mt-0.5 text-xs font-semibold text-muted">{formatVND(line.price)}</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button type="button" aria-label={`Giảm ${line.name}`} onClick={() => onSetQty(line.id, line.quantity - 1)}
                    className="flex size-6.5 items-center justify-center rounded-lg bg-page text-base text-ink">−</button>
                  <span className="text-sm font-bold text-ink">{line.quantity}</span>
                  <button type="button" aria-label={`Tăng ${line.name}`} onClick={() => onSetQty(line.id, line.quantity + 1)}
                    className="flex size-6.5 items-center justify-center rounded-lg bg-ink text-base text-white">+</button>
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-[12px] border border-dashed border-line-strong px-3.5 py-3 opacity-60">
              <input disabled placeholder="Nhập mã giảm giá" className="bg-transparent text-sm text-muted outline-none" />
              <span className="text-sm font-bold text-brand">Áp dụng</span>
            </div>
          </div>

          <div className="border-t border-line px-6 py-5">
            <div className="flex justify-between pb-2 text-sm"><span className="text-muted">Tạm tính</span><span className="font-semibold text-ink">{formatVND(subtotal)}</span></div>
            <div className="flex items-baseline justify-between border-t border-line pt-3"><span className="font-bold text-ink">Tổng cộng</span><span className="text-xl font-extrabold text-ink">{formatVND(subtotal)}</span></div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button type="button" onClick={onSubmit} disabled={submitting}
              className="mt-4 w-full rounded-button bg-ink py-4 text-center font-bold text-white disabled:opacity-50">
              {submitting ? 'Đang gửi…' : `Gửi bếp · ${formatVND(subtotal)}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

(If `size-13` / `size-6.5` are rejected, use arbitrary values `size-[52px]` /
`size-[26px]`.)

- [ ] **Step 4: Run it to confirm it passes**

Run: `bun run test:unit -- cart-panel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/cart-panel
git commit -m "feat(web): add CartPanel widget (lines, stepper, totals, submit)"
```

---

### Task 8: submit-order server function

**Files:**
- Create: `src/shared/api/order.ts`
- Modify: `src/shared/api/qr.ts` (no change needed; new file mirrors its style)
- Test: covered by the page integration test (Task 11) + manual; no unit test
  (server fn wraps `fetch`).

**Interfaces:**
- Consumes: `API_BASE_URL` from `@/shared/config`.
- Produces:
  ```ts
  submitOrderItems(opts: { data: { qrToken: string; items: { menuItemId: string; quantity: number }[] } }): Promise<{ id: string; total: number }>
  ```
  POSTs to `/api/qr/:token/order-items`; throws on non-2xx.

- [ ] **Step 1: Implement the server function**

```ts
import { createServerFn } from '@tanstack/react-start'
import { API_BASE_URL } from '@/shared/config'
import { toNumber } from '@/shared/lib/format'

interface SubmitInput {
  qrToken: string
  items: { menuItemId: string; quantity: number }[]
}

export const submitOrderItems = createServerFn({ method: 'POST' })
  .validator((d: SubmitInput) => d)
  .handler(async ({ data }) => {
    const res = await fetch(
      `${API_BASE_URL}/api/qr/${encodeURIComponent(data.qrToken)}/order-items`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: data.items }),
      },
    )
    if (!res.ok) {
      throw new Error(res.status === 404 ? 'Phiên bàn không hợp lệ' : `Gửi đơn thất bại (${res.status})`)
    }
    const json = (await res.json()) as { data: { id: string; total: unknown } }
    return { id: json.data.id, total: toNumber(json.data.total) }
  })
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shared/api/order.ts
git commit -m "feat(web): add submitOrderItems server fn (US-3.2)"
```

---

### Task 9: Route search params (US-2.2 URL state)

**Files:**
- Modify: `src/routes/t.$qrToken.tsx`

**Interfaces:**
- Produces: route search schema `{ q: string; cat: string }` (defaults `q:''`,
  `cat:'all'`), passed into `CustomerMenuPage` as `search` + a `navigate`-based
  setter. `CustomerMenuPage` props extended in Task 10.

- [ ] **Step 1: Add `validateSearch` and pass search down**

Edit `src/routes/t.$qrToken.tsx`:

```tsx
export const Route = createFileRoute('/t/$qrToken')({
  validateSearch: (search: Record<string, unknown>): { q: string; cat: string } => ({
    q: typeof search.q === 'string' ? search.q : '',
    cat: typeof search.cat === 'string' ? search.cat : 'all',
  }),
  loader: async ({ params }) => {
    const [context, menu] = await Promise.all([
      getTableContext({ data: { qrToken: params.qrToken } }),
      getMenu({ data: { qrToken: params.qrToken } }),
    ])
    return { context, menu }
  },
  errorComponent: /* unchanged */ ({ error }) => (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-bold text-red-600">Bàn không hợp lệ</h1>
      <p className="text-secondary">{error.message}</p>
      <Link to="/" className="text-brand underline">Về trang chủ</Link>
    </main>
  ),
  component: CustomerMenuRoute,
})

function CustomerMenuRoute() {
  const { context, menu } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const setSearch = (next: Partial<{ q: string; cat: string }>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  return <CustomerMenuPage context={context} menu={menu} search={search} onSearchChange={setSearch} />
}
```

- [ ] **Step 2: Typecheck (will fail until Task 10 updates the page props)**

Run: `bun run typecheck`
Expected: FAIL on `CustomerMenuPage` props — resolved in Task 10. Proceed.

- [ ] **Step 3: Commit with Task 10** (do not commit separately; the page must
  compile first).

---

### Task 10: CustomerMenuPage — compose, responsive, cart state, wire

**Files:**
- Rewrite: `src/pages/customer-menu/CustomerMenuPage.tsx`
- Delete: `src/widgets/menu-list/MenuList.tsx` + `MenuList.test.tsx` (replaced by
  MenuGrid)
- Test: `src/pages/customer-menu/CustomerMenuPage.test.tsx`

**Interfaces:**
- Consumes: `TopNav`, `MenuGrid`, `CartPanel`, `filterMenu`, cart model,
  `submitOrderItems`, search props from Task 9.
- Produces: `CustomerMenuPage(props: { context: TableContext; menu: Menu; search: { q: string; cat: string }; onSearchChange: (n: Partial<{ q: string; cat: string }>) => void; qrToken?: string })`.
  Holds `cart` + `submitting` + `error` + `notice` state; derives `quantities`
  and filtered menu; renders responsive 2-col layout (`lg:` grid with sticky
  cart) and a mobile cart bottom-bar that toggles a cart sheet.

- [ ] **Step 1: Write the failing page test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { CustomerMenuPage } from './CustomerMenuPage'
import type { Menu } from '@/entities/menu/model'
import type { TableContext } from '@/entities/table/model'

vi.mock('@/shared/api/order', () => ({
  submitOrderItems: vi.fn(() => Promise.resolve({ id: 'o1', total: 50000 })),
}))
import { submitOrderItems } from '@/shared/api/order'

const context: TableContext = {
  restaurant: { name: 'Bếp Mộc' },
  table: { id: 't1', name: 'Bàn 12', status: 'OCCUPIED' },
  session: { orderId: 'o1', status: 'OPEN', openedAt: '2026-06-28T10:00:00Z' },
}
const menu: Menu = { categories: [{ id: 'c1', name: 'Món chính', items: [
  { id: 'i1', name: 'Phở bò', description: null, price: 50000, imageUrl: null, isAvailable: true, optionGroups: [] },
  { id: 'i2', name: 'Bún chả', description: null, price: 45000, imageUrl: null, isAvailable: true, optionGroups: [] },
]}]}

function setup(search = { q: '', cat: 'all' }) {
  const onSearchChange = vi.fn()
  render(<CustomerMenuPage context={context} menu={menu} search={search} onSearchChange={onSearchChange} qrToken="tok" />)
  return { onSearchChange }
}

beforeEach(() => vi.clearAllMocks())

describe('CustomerMenuPage', () => {
  it('renders nav, menu and cart', () => {
    setup()
    expect(screen.getByText('Bếp Mộc')).toBeInTheDocument()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getAllByText('Giỏ của bạn').length).toBeGreaterThan(0)
  })
  it('typing in search calls onSearchChange', () => {
    const { onSearchChange } = setup()
    fireEvent.change(screen.getByPlaceholderText('Tìm món…'), { target: { value: 'pho' } })
    expect(onSearchChange).toHaveBeenCalledWith({ q: 'pho' })
  })
  it('applies the search filter from props', () => {
    setup({ q: 'pho', cat: 'all' })
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.queryByText('Bún chả')).not.toBeInTheDocument()
  })
  it('adding a dish updates the cart total', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    expect(screen.getAllByRole('button', { name: /Gửi bếp/ })[0]).toHaveTextContent(/50[.,]000đ/)
  })
  it('submits the cart and shows a confirmation, then clears', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Phở bò' }))
    fireEvent.click(screen.getAllByRole('button', { name: /Gửi bếp/ })[0])
    expect(submitOrderItems).toHaveBeenCalledWith({ data: { qrToken: 'tok', items: [{ menuItemId: 'i1', quantity: 1 }] } })
    expect(await screen.findByText(/Đã gửi/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bun run test:unit -- CustomerMenuPage`
Expected: FAIL (page still has old signature/markup).

- [ ] **Step 3: Rewrite the page**

```tsx
import { useState } from 'react'
import type { TableContext } from '@/entities/table/model'
import type { Menu, MenuItem } from '@/entities/menu/model'
import { filterMenu } from '@/entities/menu/filter'
import { type CartLine, addItem, setQuantity, cartCount } from '@/entities/cart/model'
import { TopNav } from '@/widgets/top-nav/TopNav'
import { MenuGrid } from '@/widgets/menu-grid/MenuGrid'
import { CartPanel } from '@/widgets/cart-panel/CartPanel'
import { submitOrderItems } from '@/shared/api/order'

interface Props {
  context: TableContext
  menu: Menu
  search: { q: string; cat: string }
  onSearchChange: (next: Partial<{ q: string; cat: string }>) => void
  qrToken?: string
}

export function CustomerMenuPage({ context, menu, search, onSearchChange, qrToken }: Props) {
  const { restaurant, table } = context
  const [cart, setCart] = useState<CartLine[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const categories = menu.categories.map((c) => ({ id: c.id, name: c.name }))
  const filtered = filterMenu(menu, search)
  const quantities = Object.fromEntries(cart.map((l) => [l.id, l.quantity]))

  const onAdd = (item: MenuItem) => setCart((c) => addItem(c, item))
  const onSetQty = (id: string, qty: number) => setCart((c) => setQuantity(c, id, qty))

  const onSubmit = async () => {
    if (cart.length === 0 || !qrToken) return
    setSubmitting(true)
    setError(null)
    try {
      await submitOrderItems({
        data: { qrToken, items: cart.map((l) => ({ menuItemId: l.id, quantity: l.quantity })) },
      })
      setCart([])
      setSheetOpen(false)
      setNotice('Đã gửi đơn tới bếp!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi đơn thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const cartProps = { cart, onSetQty, onSubmit, submitting, error }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        restaurant={restaurant}
        table={table}
        query={search.q}
        onQueryChange={(q) => onSearchChange({ q })}
      />
      {notice && (
        <div className="bg-ok-bg px-4 py-2 text-center text-sm font-semibold text-ok-text">{notice}</div>
      )}

      <div className="mx-auto flex w-full max-w-[1360px] flex-1 gap-0 lg:gap-6 lg:px-6 lg:py-6">
        <main className="flex-1 px-4 py-5 pb-28 lg:px-0 lg:pb-0">
          <MenuGrid
            menu={filtered}
            categories={categories}
            activeCat={search.cat}
            onSelectCat={(cat) => onSearchChange({ cat })}
            quantities={quantities}
            onAdd={onAdd}
          />
        </main>

        {/* Desktop cart */}
        <aside className="hidden w-[360px] shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden rounded-card border border-line-strong shadow-panel">
            <CartPanel {...cartProps} />
          </div>
        </aside>
      </div>

      {/* Mobile cart bottom bar */}
      {cartCount(cart) > 0 && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between bg-ink px-5 py-4 text-white lg:hidden"
        >
          <span className="font-semibold">{cartCount(cart)} món · Xem giỏ</span>
          <span className="font-extrabold">Giỏ của bạn</span>
        </button>
      )}

      {/* Mobile cart sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40 lg:hidden" onClick={() => setSheetOpen(false)}>
          <div className="max-h-[85vh] overflow-hidden rounded-t-card bg-white" onClick={(e) => e.stopPropagation()}>
            <CartPanel {...cartProps} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Delete the obsolete MenuList widget**

```bash
git rm src/widgets/menu-list/MenuList.tsx src/widgets/menu-list/MenuList.test.tsx
```

- [ ] **Step 5: Run validate**

Run: `bun run validate`
Expected: PASS (page + all widget/unit tests green; Task 9's typecheck error
resolved).

- [ ] **Step 6: Commit (with Task 9's route change)**

```bash
git add src/routes/t.\$qrToken.tsx src/pages/customer-menu src/widgets/menu-list
git commit -m "feat(web): compose responsive menu+cart page wired to BE (US-2.1/2.2/3.1/3.2)"
```

---

### Task 11: E2E — search filters the list (US-2.2)

**Files:**
- Modify: `e2e/` (add a spec; reuse existing harness). Check existing specs for
  the pattern first: `ls e2e` and open the invalid-token spec.

**Interfaces:**
- Consumes: a seeded `qr_token` OR a stubbed menu. Because the menu is fetched in
  a server function, `page.route()` cannot intercept it (server-side). Use a
  **seeded token** from the running BE.

- [ ] **Step 1: Get a seeded token**

Run (BE must be up): query the BE/DB for a valid `qr_token`. Try the health/seed
path or ask the user for a known token. Record it as `E2E_QR_TOKEN` env.

```bash
curl -s http://localhost:3000/api/health
# then use a known seeded token, e.g. from the BE seed script
```

If no seed exists, **skip this task** and leave US-2.2 e2e in backlog #2 (note it
in the story). Do not fabricate a token.

- [ ] **Step 2: Write the e2e (guarded by token presence)**

```ts
import { test, expect } from '@playwright/test'

const token = process.env.E2E_QR_TOKEN
test.skip(!token, 'needs a seeded qr_token (backlog #2)')

test('search filters the menu', async ({ page }) => {
  await page.goto(`/t/${token}`)
  await expect(page.getByPlaceholder('Tìm món…')).toBeVisible()
  const before = await page.locator('[data-dish]').count()
  await page.getByPlaceholder('Tìm món…').fill('zzz-no-match')
  await expect(page.getByText('Không tìm thấy món phù hợp.')).toBeVisible()
  await page.getByPlaceholder('Tìm món…').fill('')
  await expect(page.locator('[data-dish]')).toHaveCount(before)
})
```

(Add `data-dish` to the `DishCard` root in `MenuGrid.tsx` for a stable selector.)

- [ ] **Step 3: Run e2e**

Run: `E2E_QR_TOKEN=<token> bun run test:e2e`
Expected: PASS (or skipped if no token).

- [ ] **Step 4: Commit**

```bash
git add e2e src/widgets/menu-grid/MenuGrid.tsx
git commit -m "test(web): e2e search filters the menu (US-2.2)"
```

---

### Task 12: Harness story packets + matrix

**Files:**
- Modify: `docs/stories/epics/E02-menu-browsing/US-2.1-customer-views-menu.md`
  (note the desktop redesign + responsive).
- Create: `docs/stories/epics/E02-menu-browsing/US-2.2-customer-searches-menu.md`
- Create: `docs/stories/epics/E03-cart-ordering/US-3.1-customer-cart.md`
- Create: `docs/stories/epics/E03-cart-ordering/US-3.2-customer-submits-order.md`
- Update product doc: `docs/product/menu-browsing.md` ("Not yet covered" list).

**Interfaces:** Follow `docs/templates/story.md`. Record proof per
`docs/HARNESS.md`. Update the matrix:

- [ ] **Step 1: Write the four story packets** using `docs/templates/story.md`,
  each with Status, Product Contract, Acceptance Criteria (from SPEC), Design
  Notes (FSD surfaces + BE endpoint), and a Validation table referencing the
  vitest/playwright proofs added above.

- [ ] **Step 2: Update the harness matrix**

```bash
./scripts/bin/harness-cli story update US-2.1 --status implemented
./scripts/bin/harness-cli story add US-2.2 --title "Customer searches/filters the menu" --status implemented
./scripts/bin/harness-cli story add US-3.1 --title "Customer adds dishes to the cart" --status implemented
./scripts/bin/harness-cli story add US-3.2 --title "Customer submits the order to the kitchen" --status implemented
```

(Confirm exact CLI flags with `./scripts/bin/harness-cli story --help` first;
adjust to the real interface.)

- [ ] **Step 3: Update `docs/product/menu-browsing.md`** — move Search and Cart
  out of "Not yet covered"; note options/tracking remain.

- [ ] **Step 4: Final validate + commit**

```bash
bun run validate && bun run lint && bun run format:check
git add docs
git commit -m "docs(harness): record US-2.1/2.2/3.1/3.2 stories + matrix"
```

---

## Self-Review

- **Spec coverage:** US-2.1 redesign → Tasks 1,5,6,7,10; US-2.2 → Tasks 2,3,9,10,11;
  US-3.1 → Tasks 4,7,10; US-3.2 → Tasks 8,10. Design tokens → Task 1. Responsive
  (mobile sheet) → Task 10. Out-of-scope items (promo wired, discount logic,
  options, tracking, persistence) intentionally excluded — matches spec.
- **Placeholder scan:** none — every code step shows full code; Task 11 is
  conditionally skipped with an explicit reason (not a placeholder).
- **Type consistency:** `formatVND`, `filterMenu`/`countItems`, cart
  `addItem`/`setQuantity`/`cartCount`/`cartSubtotal`, `CartLine`,
  `submitOrderItems` signature, and search shape `{ q, cat }` are used
  identically across tasks.
- **Known risk:** Tailwind v4 may reject fractional utilities (`gap-4.5`,
  `size-6.5`, `size-13`) — fall back to arbitrary values as noted inline.
