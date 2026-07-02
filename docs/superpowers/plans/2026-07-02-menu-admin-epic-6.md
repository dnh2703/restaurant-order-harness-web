# Epic 6 Menu Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/kitchen/menu` so an admin can manage categories, menu items, option groups, and options.

**Architecture:** Reuse the existing `/kitchen/*` staff shell and admin-only guard pattern from `/kitchen/tables`. Keep admin CRUD UI in page/widgets, and keep backend proxy logic in `shared/api` as infrastructure.

**Tech Stack:** TanStack Start server functions, React 19, FSD, Vitest, Testing Library, existing `DataTable`, `Dialog`, `Select`, `Input`, `Badge`, `Button`, and `sonner` toast primitives.

---

## File Structure

- Create: `docs/product/menu-admin.md` — living product contract for Epic 6 FE.
- Create: `docs/stories/epics/E06-menu-admin/US-6.1-admin-manages-categories.md`
- Create: `docs/stories/epics/E06-menu-admin/US-6.2-admin-manages-menu-items.md`
- Create: `docs/stories/epics/E06-menu-admin/US-6.3-admin-manages-options.md`
- Create: `src/shared/api/types/menu-admin.ts` — admin category/item/option view types and inputs.
- Create: `src/shared/api/menu-admin-normalize.ts`
- Create: `src/shared/api/menu-admin-normalize.test.ts`
- Create: `src/shared/api/menu-admin.server.ts`
- Create: `src/shared/api/menu-admin.ts`
- Create: `src/shared/api/menu-admin.test.ts`
- Modify: `src/widgets/side-nav/SideNav.tsx`
- Modify: `src/widgets/side-nav/SideNav.test.tsx`
- Modify: `src/routes/kitchen.tsx`
- Create: `src/routes/kitchen.menu.tsx`
- Create: `src/pages/kitchen-menu/KitchenMenuPage.tsx`
- Create: `src/pages/kitchen-menu/KitchenMenuPage.test.tsx`
- Create: `src/pages/kitchen-menu/index.ts`
- Create: `src/widgets/menu-admin-list/MenuAdminList.tsx`
- Create: `src/widgets/menu-admin-list/MenuAdminList.test.tsx`
- Create: `src/widgets/menu-admin-list/index.ts`
- Create: `src/widgets/category-admin-dialog/CategoryAdminDialog.tsx`
- Create: `src/widgets/category-admin-dialog/CategoryAdminDialog.test.tsx`
- Create: `src/widgets/category-admin-dialog/index.ts`
- Create: `src/widgets/menu-admin-form/MenuItemDialog.tsx`
- Create: `src/widgets/menu-admin-form/MenuItemDialog.test.tsx`
- Create: `src/widgets/menu-admin-form/OptionEditor.tsx`
- Create: `src/widgets/menu-admin-form/OptionEditor.test.tsx`
- Create: `src/widgets/menu-admin-form/index.ts`
- Create: `e2e/menu-admin.spec.ts`

---

### Task 1: Product Docs And Durable Story Packets

**Files:**
- Create: `docs/product/menu-admin.md`
- Create: `docs/stories/epics/E06-menu-admin/US-6.1-admin-manages-categories.md`
- Create: `docs/stories/epics/E06-menu-admin/US-6.2-admin-manages-menu-items.md`
- Create: `docs/stories/epics/E06-menu-admin/US-6.3-admin-manages-options.md`

- [ ] **Step 1: Add product contract**

Create `docs/product/menu-admin.md`:

```markdown
# Product: Menu Administration

Derived from SPEC EPIC 6. Defines the admin-facing menu management surface.

## Behavior

An authenticated `ADMIN` opens `/kitchen/menu` to manage categories, dishes,
and dish option groups/options. Changes are scoped to the admin restaurant by
the backend session. Dishes marked unavailable are hidden or dimmed in customer
menu surfaces according to the existing customer menu contract.

## Backend contract

Source: `GET http://localhost:3002/api/docs/json`.

- Categories: `GET/POST /api/categories/`, `PATCH/DELETE /api/categories/:id`.
- Menu items: `GET/POST /api/menu-items/`, `PATCH/DELETE /api/menu-items/:id`.
- Option groups: `GET/POST /api/menu-items/:id/option-groups`,
  `PATCH/DELETE /api/menu-items/:id/option-groups/:groupId`.
- Options: `POST /api/menu-items/:id/option-groups/:groupId/options`,
  `PATCH/DELETE /api/menu-items/:id/option-groups/:groupId/options/:optionId`.

## Frontend contract

- Route: `/kitchen/menu`.
- Access: `ADMIN` only.
- Navigation: sidebar tab `Thực đơn`, visible only to `ADMIN`.
- Image management uses `imageUrl`; no file upload in MVP.
- Option groups/options are edited inside the dish dialog.

## Not covered

- Uploading images.
- Drag-and-drop sorting.
- Bulk import/export.
- Separate public admin namespace.
```

- [ ] **Step 2: Add story packets**

Create the three story markdown files with `Status: planned`, lane `normal`, acceptance criteria from the spec, and validation rows for unit/component/e2e.

- [ ] **Step 3: Update durable rows**

Run:

```bash
scripts/bin/harness-cli story update --id US-6.1 --status planned --unit 0 --integration 0 --e2e 0 --platform 0 --evidence "Epic 6 design approved; implementation pending"
scripts/bin/harness-cli story update --id US-6.2 --status planned --unit 0 --integration 0 --e2e 0 --platform 0 --evidence "Epic 6 design approved; implementation pending"
scripts/bin/harness-cli story update --id US-6.3 --status planned --unit 0 --integration 0 --e2e 0 --platform 0 --evidence "Epic 6 design approved; implementation pending"
```

Expected: each command exits `0`.

- [ ] **Step 4: Commit**

```bash
git add docs/product/menu-admin.md docs/stories/epics/E06-menu-admin
git commit -m "docs: record epic 6 menu admin stories"
```

---

### Task 2: Admin Menu API Types And Normalizers

**Files:**
- Create: `src/shared/api/types/menu-admin.ts`
- Create: `src/shared/api/menu-admin-normalize.ts`
- Create: `src/shared/api/menu-admin-normalize.test.ts`

- [ ] **Step 1: Write failing normalizer tests**

Create `src/shared/api/menu-admin-normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  normalizeAdminCategory,
  normalizeAdminMenuItem,
  normalizeOptionGroup,
} from './menu-admin-normalize'

describe('menu admin normalizers', () => {
  it('coerces category sortOrder from string', () => {
    expect(
      normalizeAdminCategory({
        id: 'c1',
        restaurantId: 'r1',
        name: 'Món chính',
        sortOrder: '2',
      }),
    ).toEqual({ id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 2 })
  })

  it('coerces menu item price/sort order and preserves nullable fields', () => {
    expect(
      normalizeAdminMenuItem({
        id: 'm1',
        categoryId: 'c1',
        name: 'Phở bò',
        description: null,
        price: '65000',
        imageUrl: null,
        isAvailable: true,
        sortOrder: '3',
      }),
    ).toEqual({
      id: 'm1',
      categoryId: 'c1',
      name: 'Phở bò',
      description: null,
      price: 65000,
      imageUrl: null,
      isAvailable: true,
      sortOrder: 3,
    })
  })

  it('normalizes option groups and option price deltas', () => {
    expect(
      normalizeOptionGroup({
        id: 'g1',
        menuItemId: 'm1',
        name: 'Size',
        type: 'SINGLE',
        isRequired: true,
        options: [{ id: 'o1', optionGroupId: 'g1', name: 'Lớn', priceDelta: '10000' }],
      }),
    ).toMatchObject({
      id: 'g1',
      type: 'SINGLE',
      options: [{ priceDelta: 10000 }],
    })
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
bun run test src/shared/api/menu-admin-normalize.test.ts
```

Expected: FAIL because `menu-admin-normalize` does not exist.

- [ ] **Step 3: Add types**

Create `src/shared/api/types/menu-admin.ts`:

```ts
export type OptionGroupType = 'SINGLE' | 'MULTI'

export interface AdminCategoryView {
  id: string
  restaurantId: string
  name: string
  sortOrder: number
}

export interface AdminMenuItemView {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
  sortOrder: number
}

export interface AdminOptionView {
  id: string
  optionGroupId: string
  name: string
  priceDelta: number
}

export interface AdminOptionGroupView {
  id: string
  menuItemId: string
  name: string
  type: OptionGroupType
  isRequired: boolean
  options: AdminOptionView[]
}

export interface SaveCategoryInput {
  name: string
  sortOrder?: number
}

export interface SaveMenuItemInput {
  categoryId: string
  name: string
  price: number
  description?: string | null
  imageUrl?: string | null
  isAvailable?: boolean
  sortOrder?: number
}

export interface SaveOptionGroupInput {
  name: string
  type: OptionGroupType
  isRequired?: boolean
}

export interface SaveOptionInput {
  name: string
  priceDelta?: number
}
```

- [ ] **Step 4: Add normalizers**

Create `src/shared/api/menu-admin-normalize.ts`:

```ts
import type {
  AdminCategoryView,
  AdminMenuItemView,
  AdminOptionGroupView,
  AdminOptionView,
  OptionGroupType,
} from '@/shared/api/types/menu-admin'

function toNumber(value: unknown, fallback = 0): number {
  const next = Number(value ?? fallback)
  return Number.isFinite(next) ? next : fallback
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

export function normalizeAdminCategory(raw: unknown): AdminCategoryView {
  const row = raw as { id: unknown; restaurantId: unknown; name: unknown; sortOrder: unknown }
  return {
    id: String(row.id),
    restaurantId: String(row.restaurantId),
    name: String(row.name),
    sortOrder: toNumber(row.sortOrder),
  }
}

export function normalizeAdminMenuItem(raw: unknown): AdminMenuItemView {
  const row = raw as {
    id: unknown
    categoryId: unknown
    name: unknown
    description: unknown
    price: unknown
    imageUrl: unknown
    isAvailable: unknown
    sortOrder: unknown
  }
  return {
    id: String(row.id),
    categoryId: String(row.categoryId),
    name: String(row.name),
    description: toNullableString(row.description),
    price: toNumber(row.price),
    imageUrl: toNullableString(row.imageUrl),
    isAvailable: row.isAvailable === true,
    sortOrder: toNumber(row.sortOrder),
  }
}

export function normalizeOption(raw: unknown): AdminOptionView {
  const row = raw as { id: unknown; optionGroupId: unknown; name: unknown; priceDelta: unknown }
  return {
    id: String(row.id),
    optionGroupId: String(row.optionGroupId),
    name: String(row.name),
    priceDelta: toNumber(row.priceDelta),
  }
}

export function normalizeOptionGroup(raw: unknown): AdminOptionGroupView {
  const row = raw as {
    id: unknown
    menuItemId: unknown
    name: unknown
    type: unknown
    isRequired: unknown
    options?: unknown[]
  }
  return {
    id: String(row.id),
    menuItemId: String(row.menuItemId),
    name: String(row.name),
    type: row.type === 'MULTI' ? 'MULTI' : ('SINGLE' as OptionGroupType),
    isRequired: row.isRequired === true,
    options: (row.options ?? []).map(normalizeOption),
  }
}
```

- [ ] **Step 5: Run GREEN**

Run:

```bash
bun run test src/shared/api/menu-admin-normalize.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/types/menu-admin.ts src/shared/api/menu-admin-normalize.ts src/shared/api/menu-admin-normalize.test.ts
git commit -m "feat: add menu admin api normalizers"
```

---

### Task 3: Admin Menu API Fetch Helpers And Server Functions

**Files:**
- Create: `src/shared/api/menu-admin.server.ts`
- Create: `src/shared/api/menu-admin.ts`
- Create: `src/shared/api/menu-admin.test.ts`

- [ ] **Step 1: Write failing API helper tests**

Create `src/shared/api/menu-admin.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createCategory,
  createMenuItem,
  createOption,
  createOptionGroup,
  deleteMenuItem,
  fetchCategories,
  fetchMenuItems,
  updateMenuItem,
} from './menu-admin.server'
import type { TokenStore } from '@/shared/lib/staff-auth.server'

function fakeStore(): TokenStore {
  return { getAccess: () => 'A', getRefresh: () => 'R', save: () => {}, clear: () => {} }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => vi.restoreAllMocks())

describe('menu admin api helpers', () => {
  it('lists categories and menu items', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { categories: [{ id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: '1' }] } }))
      .mockResolvedValueOnce(jsonResponse({ data: { menuItems: [{ id: 'm1', categoryId: 'c1', name: 'Phở', description: null, price: '50000', imageUrl: null, isAvailable: true, sortOrder: 1 }] } }))

    expect(await fetchCategories(fakeStore())).toHaveLength(1)
    expect(await fetchMenuItems(fakeStore())).toHaveLength(1)
  })

  it('posts category and dish payloads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { category: { id: 'c1', restaurantId: 'r1', name: 'Nước', sortOrder: 2 } } }, 201))
      .mockResolvedValueOnce(jsonResponse({ data: { menuItem: { id: 'm1', categoryId: 'c1', name: 'Trà đá', description: null, price: 5000, imageUrl: null, isAvailable: true, sortOrder: 1 } } }, 201))

    await createCategory(fakeStore(), { name: 'Nước', sortOrder: 2 })
    await createMenuItem(fakeStore(), { categoryId: 'c1', name: 'Trà đá', price: 5000, isAvailable: true })

    expect(JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)).toEqual({ name: 'Nước', sortOrder: 2 })
    expect(JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string)).toMatchObject({ categoryId: 'c1', name: 'Trà đá', price: 5000 })
  })

  it('patches and deletes menu items', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { menuItem: { id: 'm1', categoryId: 'c1', name: 'Phở đặc biệt', description: null, price: 70000, imageUrl: null, isAvailable: false, sortOrder: 1 } } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await updateMenuItem(fakeStore(), { id: 'm1', name: 'Phở đặc biệt', isAvailable: false })
    await deleteMenuItem(fakeStore(), 'm1')

    expect(fetchMock.mock.calls[0]![0]).toContain('/api/menu-items/m1')
    expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe('PATCH')
    expect((fetchMock.mock.calls[1]![1] as RequestInit).method).toBe('DELETE')
  })

  it('creates option groups and options', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { optionGroup: { id: 'g1', menuItemId: 'm1', name: 'Size', type: 'SINGLE', isRequired: true, options: [] } } }, 201))
      .mockResolvedValueOnce(jsonResponse({ data: { option: { id: 'o1', optionGroupId: 'g1', name: 'Lớn', priceDelta: 10000 } } }, 201))

    await createOptionGroup(fakeStore(), 'm1', { name: 'Size', type: 'SINGLE', isRequired: true })
    await createOption(fakeStore(), 'm1', 'g1', { name: 'Lớn', priceDelta: 10000 })

    expect(fetchMock.mock.calls[0]![0]).toContain('/api/menu-items/m1/option-groups')
    expect(fetchMock.mock.calls[1]![0]).toContain('/api/menu-items/m1/option-groups/g1/options')
  })
})
```

- [ ] **Step 2: Run RED**

Run:

```bash
bun run test src/shared/api/menu-admin.test.ts
```

Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement fetch helpers**

Create `src/shared/api/menu-admin.server.ts` using `authedFetch`, normalizers, and the same `readError`/`readOne` pattern as `tables.server.ts`. Include these exports:

```ts
export class MenuAdminApiError extends Error {}
export async function fetchCategories(store: TokenStore): Promise<AdminCategoryView[]>
export async function createCategory(store: TokenStore, input: SaveCategoryInput): Promise<AdminCategoryView>
export async function updateCategory(store: TokenStore, input: SaveCategoryInput & { id: string }): Promise<AdminCategoryView>
export async function deleteCategory(store: TokenStore, id: string): Promise<void>
export async function fetchMenuItems(store: TokenStore, categoryId?: string): Promise<AdminMenuItemView[]>
export async function createMenuItem(store: TokenStore, input: SaveMenuItemInput): Promise<AdminMenuItemView>
export async function updateMenuItem(store: TokenStore, input: Partial<SaveMenuItemInput> & { id: string }): Promise<AdminMenuItemView>
export async function deleteMenuItem(store: TokenStore, id: string): Promise<void>
export async function fetchOptionGroups(store: TokenStore, menuItemId: string): Promise<AdminOptionGroupView[]>
export async function createOptionGroup(store: TokenStore, menuItemId: string, input: SaveOptionGroupInput): Promise<AdminOptionGroupView>
export async function updateOptionGroup(store: TokenStore, menuItemId: string, groupId: string, input: Partial<SaveOptionGroupInput>): Promise<AdminOptionGroupView>
export async function deleteOptionGroup(store: TokenStore, menuItemId: string, groupId: string): Promise<void>
export async function createOption(store: TokenStore, menuItemId: string, groupId: string, input: SaveOptionInput): Promise<AdminOptionView>
export async function updateOption(store: TokenStore, menuItemId: string, groupId: string, optionId: string, input: Partial<SaveOptionInput>): Promise<AdminOptionView>
export async function deleteOption(store: TokenStore, menuItemId: string, groupId: string, optionId: string): Promise<void>
```

Use exact paths from Swagger, including trailing slash on collection paths:
`/api/categories/` and `/api/menu-items/`.

- [ ] **Step 4: Implement server functions**

Create `src/shared/api/menu-admin.ts` with `createServerFn` wrappers using `cookieTokenStore`. Export all view/input types from `types/menu-admin.ts`.

- [ ] **Step 5: Run GREEN**

Run:

```bash
bun run test src/shared/api/menu-admin.test.ts src/shared/api/menu-admin-normalize.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/api/menu-admin.server.ts src/shared/api/menu-admin.ts src/shared/api/menu-admin.test.ts
git commit -m "feat: add menu admin api client"
```

---

### Task 4: Admin Route Guard, Route, And Sidebar Tab

**Files:**
- Modify: `src/routes/kitchen.tsx`
- Create: `src/routes/kitchen.menu.tsx`
- Modify: `src/widgets/side-nav/SideNav.tsx`
- Modify: `src/widgets/side-nav/SideNav.test.tsx`
- Create: `src/pages/kitchen-menu/index.ts`
- Create: `src/pages/kitchen-menu/KitchenMenuPage.tsx`

- [ ] **Step 1: Write failing SideNav tests**

Update `src/widgets/side-nav/SideNav.test.tsx` so admin sees `Thực đơn`, kitchen staff does not, and `activeSection="menu"` marks it current.

- [ ] **Step 2: Run RED**

```bash
bun run test src/widgets/side-nav/SideNav.test.tsx
```

Expected: FAIL because `activeSection` does not accept `menu` and tab is missing.

- [ ] **Step 3: Update SideNav**

Change `activeSection` to `'board' | 'tables' | 'menu'`; import `BookOpenIcon` from `@phosphor-icons/react`; add admin-only link:

```tsx
{userRole === 'ADMIN' && (
  <a href="/kitchen/menu" aria-current={onMenu ? 'page' : undefined} className={...}>
    <BookOpenIcon size={18} weight="bold" />
    Thực đơn
  </a>
)}
```

- [ ] **Step 4: Add page skeleton**

Create `src/pages/kitchen-menu/KitchenMenuPage.tsx`:

```tsx
import { SideNav } from '@/widgets/side-nav'
import type { StaffUser } from '@/entities/staff'
import type { AdminCategoryView, AdminMenuItemView } from '@/shared/api/types/menu-admin'
import { Button, Toaster } from '@/shared/ui'

interface Props {
  user: StaffUser
  initialCategories: AdminCategoryView[]
  initialMenuItems: AdminMenuItemView[]
  onLogout: () => void
}

export function KitchenMenuPage({ user, onLogout }: Props) {
  return (
    <div className="flex min-h-screen bg-page">
      <SideNav userName={user.name} userRole={user.role} onLogout={onLogout} activeSection="menu" />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Thực đơn</h1>
            <p className="text-sm text-muted">Quản lý danh mục, món ăn và tùy chọn gọi món.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onLogout} className="md:hidden">
            Đăng xuất
          </Button>
        </header>
      </main>
      <Toaster />
    </div>
  )
}
```

Create `src/pages/kitchen-menu/index.ts`:

```ts
export { KitchenMenuPage } from './KitchenMenuPage'
```

- [ ] **Step 5: Add route and guard**

In `src/routes/kitchen.tsx`, redirect non-admins from `/kitchen/menu` just like `/kitchen/tables`.

Create `src/routes/kitchen.menu.tsx` with loader:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KitchenMenuPage } from '@/pages/kitchen-menu'
import type { StaffUser } from '@/entities/staff'
import { getStaffSession, logoutStaff } from '@/shared/api/auth'
import { listCategories, listMenuItems } from '@/shared/api/menu-admin'

export const Route = createFileRoute('/kitchen/menu')({
  loader: async (): Promise<{ user: StaffUser; categories: Awaited<ReturnType<typeof listCategories>>; menuItems: Awaited<ReturnType<typeof listMenuItems>> }> => {
    const session = await getStaffSession()
    if (!session) throw new Error('No session')
    const [categories, menuItems] = await Promise.all([listCategories(), listMenuItems()])
    return { user: session, categories, menuItems }
  },
  component: KitchenMenuRoute,
})

function KitchenMenuRoute() {
  const { user, categories, menuItems } = Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <KitchenMenuPage
      user={user}
      initialCategories={categories}
      initialMenuItems={menuItems}
      onLogout={async () => {
        await logoutStaff()
        await navigate({ to: '/kitchen/login' })
      }}
    />
  )
}
```

- [ ] **Step 6: Run GREEN**

```bash
bun run test src/widgets/side-nav/SideNav.test.tsx
bun run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/routes/kitchen.tsx src/routes/kitchen.menu.tsx src/pages/kitchen-menu src/widgets/side-nav
git commit -m "feat: add admin menu route shell"
```

---

### Task 5: Menu Admin List

**Files:**
- Create: `src/widgets/menu-admin-list/MenuAdminList.tsx`
- Create: `src/widgets/menu-admin-list/MenuAdminList.test.tsx`
- Create: `src/widgets/menu-admin-list/index.ts`
- Modify: `src/pages/kitchen-menu/KitchenMenuPage.tsx`
- Create: `src/pages/kitchen-menu/KitchenMenuPage.test.tsx`

- [ ] **Step 1: Write failing list tests**

Test that the list renders dishes, filters by search/category, formats VND, and calls row actions.

- [ ] **Step 2: Run RED**

```bash
bun run test src/widgets/menu-admin-list/MenuAdminList.test.tsx
```

Expected: FAIL because widget does not exist.

- [ ] **Step 3: Implement MenuAdminList**

Use existing `DataTable`, `Pagination`, `Input`, `Select`, `Badge`, `Button`. Props:

```ts
interface Props {
  categories: AdminCategoryView[]
  menuItems: AdminMenuItemView[]
  onCreateItem: () => void
  onEditItem: (item: AdminMenuItemView) => void
  onDeleteItem: (item: AdminMenuItemView) => void
  onOpenCategories: () => void
}
```

Sort/filter in component; keep page size at 10.

- [ ] **Step 4: Wire page state**

In `KitchenMenuPage`, store `categories` and `menuItems` in `useState`, render `MenuAdminList`, and leave dialog callbacks as no-op state openers for later tasks.

- [ ] **Step 5: Run GREEN**

```bash
bun run test src/widgets/menu-admin-list/MenuAdminList.test.tsx src/pages/kitchen-menu/KitchenMenuPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/menu-admin-list src/pages/kitchen-menu
git commit -m "feat: add menu admin list"
```

---

### Task 6: Category CRUD Dialog

**Files:**
- Create: `src/widgets/category-admin-dialog/CategoryAdminDialog.tsx`
- Create: `src/widgets/category-admin-dialog/CategoryAdminDialog.test.tsx`
- Create: `src/widgets/category-admin-dialog/index.ts`
- Modify: `src/pages/kitchen-menu/KitchenMenuPage.tsx`

- [ ] **Step 1: Write failing dialog tests**

Test create, edit, delete confirmation, busy state, and trimmed name payload.

- [ ] **Step 2: Run RED**

```bash
bun run test src/widgets/category-admin-dialog/CategoryAdminDialog.test.tsx
```

Expected: FAIL because dialog does not exist.

- [ ] **Step 3: Implement CategoryAdminDialog**

Props:

```ts
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: AdminCategoryView[]
  onCreate: (input: SaveCategoryInput) => Promise<void>
  onUpdate: (input: SaveCategoryInput & { id: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}
```

Use `Dialog`, `Input`, native `button`/existing `Button`, and numeric input for `sortOrder`.

- [ ] **Step 4: Wire mutations in page**

Use `createCategory`, `updateCategory`, `deleteCategory` server functions. On success update local state sorted by `sortOrder`, then name; toast success/failure.

- [ ] **Step 5: Run GREEN**

```bash
bun run test src/widgets/category-admin-dialog/CategoryAdminDialog.test.tsx src/pages/kitchen-menu/KitchenMenuPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/category-admin-dialog src/pages/kitchen-menu
git commit -m "feat: add category management dialog"
```

---

### Task 7: Dish CRUD Dialog

**Files:**
- Create: `src/widgets/menu-admin-form/MenuItemDialog.tsx`
- Create: `src/widgets/menu-admin-form/MenuItemDialog.test.tsx`
- Create: `src/widgets/menu-admin-form/index.ts`
- Modify: `src/pages/kitchen-menu/KitchenMenuPage.tsx`

- [ ] **Step 1: Write failing dialog tests**

Test create/edit payloads: trimmed name, selected category, numeric price, nullable image/description, availability, sort order.

- [ ] **Step 2: Run RED**

```bash
bun run test src/widgets/menu-admin-form/MenuItemDialog.test.tsx
```

Expected: FAIL because dialog does not exist.

- [ ] **Step 3: Implement MenuItemDialog**

Props:

```ts
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: AdminCategoryView[]
  item: AdminMenuItemView | null
  onSave: (input: SaveMenuItemInput | (Partial<SaveMenuItemInput> & { id: string })) => Promise<AdminMenuItemView>
}
```

Use native `<textarea>` for description and native checkbox for availability.
Disable save when there are no categories.

- [ ] **Step 4: Wire create/update/delete in page**

Use `createMenuItem`, `updateMenuItem`, `deleteMenuItem`. Delete uses existing `AlertDialog` pattern similar to table deletion.

- [ ] **Step 5: Run GREEN**

```bash
bun run test src/widgets/menu-admin-form/MenuItemDialog.test.tsx src/pages/kitchen-menu/KitchenMenuPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/menu-admin-form src/pages/kitchen-menu
git commit -m "feat: add menu item CRUD dialog"
```

---

### Task 8: Option Group And Option Editor

**Files:**
- Create: `src/widgets/menu-admin-form/OptionEditor.tsx`
- Create: `src/widgets/menu-admin-form/OptionEditor.test.tsx`
- Modify: `src/widgets/menu-admin-form/MenuItemDialog.tsx`
- Modify: `src/pages/kitchen-menu/KitchenMenuPage.tsx`

- [ ] **Step 1: Write failing OptionEditor tests**

Test rendering groups/options, creating a group, creating an option, editing names/price delta, and deleting group/option.

- [ ] **Step 2: Run RED**

```bash
bun run test src/widgets/menu-admin-form/OptionEditor.test.tsx
```

Expected: FAIL because editor does not exist.

- [ ] **Step 3: Implement OptionEditor**

Props:

```ts
interface Props {
  menuItemId: string | null
  groups: AdminOptionGroupView[]
  onCreateGroup: (input: SaveOptionGroupInput) => Promise<void>
  onUpdateGroup: (groupId: string, input: Partial<SaveOptionGroupInput>) => Promise<void>
  onDeleteGroup: (groupId: string) => Promise<void>
  onCreateOption: (groupId: string, input: SaveOptionInput) => Promise<void>
  onUpdateOption: (groupId: string, optionId: string, input: Partial<SaveOptionInput>) => Promise<void>
  onDeleteOption: (groupId: string, optionId: string) => Promise<void>
}
```

When `menuItemId` is `null`, show disabled copy: `Lưu món trước khi thêm tùy chọn.`

- [ ] **Step 4: Wire option mutations**

When edit dialog opens for an existing item, call `listOptionGroups({ data: { menuItemId } })`.
After each option mutation, refresh groups for that dish.
After creating a new dish, keep dialog open and set the saved item as current so options can be added.

- [ ] **Step 5: Run GREEN**

```bash
bun run test src/widgets/menu-admin-form/OptionEditor.test.tsx src/widgets/menu-admin-form/MenuItemDialog.test.tsx src/pages/kitchen-menu/KitchenMenuPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/menu-admin-form src/pages/kitchen-menu
git commit -m "feat: add option group editor"
```

---

### Task 9: E2E Smoke And Harness Proof

**Files:**
- Create: `e2e/menu-admin.spec.ts`
- Modify: Harness durable story rows via CLI.

- [ ] **Step 1: Add gated e2e**

Create `e2e/menu-admin.spec.ts` that skips unless `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` are set. Flow: login -> open `/kitchen/menu` -> assert title -> create a category -> create a dish -> add option group/option -> mark unavailable -> assert `Hết món`.

- [ ] **Step 2: Run unit validation**

```bash
bun run validate
```

Expected: typecheck passes and Vitest passes.

- [ ] **Step 3: Run FSD lint**

```bash
bun run lint:fsd
```

Expected: no forbidden import output.

- [ ] **Step 4: Run e2e skip/pass**

```bash
bun run test:e2e e2e/menu-admin.spec.ts
```

Expected: skip cleanly when admin env vars are unset, or pass against seeded BE.

- [ ] **Step 5: Update matrix**

```bash
scripts/bin/harness-cli story update --id US-6.1 --status implemented --unit 1 --integration 1 --e2e 1 --platform 0 --evidence "menu category CRUD dialog; API helper tests; gated e2e menu admin smoke"
scripts/bin/harness-cli story update --id US-6.2 --status implemented --unit 1 --integration 1 --e2e 1 --platform 0 --evidence "menu item CRUD dialog/list; API helper tests; gated e2e menu admin smoke"
scripts/bin/harness-cli story update --id US-6.3 --status implemented --unit 1 --integration 1 --e2e 1 --platform 0 --evidence "option group/option editor; API helper tests; gated e2e menu admin smoke"
```

- [ ] **Step 6: Record trace**

Read `docs/TRACE_SPEC.md`, then run a Harness trace with summary, validation commands, changed files, and friction.

- [ ] **Step 7: Commit**

```bash
git add e2e/menu-admin.spec.ts
git commit -m "test: add menu admin e2e smoke"
```

---

## Self-Review

- **Spec coverage:** US-6.1 covered by Tasks 1, 2, 3, 6, 9. US-6.2 covered by Tasks 1, 2, 3, 5, 7, 9. US-6.3 covered by Tasks 1, 2, 3, 8, 9.
- **Placeholder scan:** No unresolved placeholder text.
- **Type consistency:** All admin types live in `src/shared/api/types/menu-admin.ts`; server helpers and widgets import those public types.
- **FSD check:** CRUD helpers live in `shared/api`; route/page orchestration lives in `pages`; reused admin UI blocks live in `widgets`; no new entity slice.
