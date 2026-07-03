# Design — Epic 6: Menu Administration

Date: 2026-07-02
Status: **approved**
Repo touched: `restaurant-order-harness-web` (FE)
BE: **already implemented** on `localhost:3002/api/docs/json`; FE codes against
the existing Categories, Menu Items, and Option Groups contracts.

## 1. Goal & Scope

Build the admin-facing menu management screen for Epic 6:

- **US-6.1** — Admin CRUD categories.
- **US-6.2** — Admin CRUD dishes: name, category, price, image URL, description,
  availability, and sort order.
- **US-6.3** — Admin CRUD option groups and options for a dish.

### In scope

- Add `/kitchen/menu`, visible to `ADMIN` only.
- Extend the existing staff shell and `SideNav` with **Thực đơn**.
- Menu item list based on wireframe screen **10 · Quản lý thực đơn**.
- Category filter, search, create/edit/delete dishes.
- Category management in a compact panel/dialog on the same screen.
- Option groups/options managed inside the create/edit dish dialog.
- Server functions in `shared/api/menu-admin.ts`, proxying the BE through the
  existing staff auth cookie/session flow.
- Unit/component tests and a gated e2e smoke test.

### Out of scope

- BE changes.
- File upload/storage for images; use `imageUrl` text input.
- Drag-and-drop sorting; expose numeric `sortOrder`.
- Bulk import/export.
- Cashier, reports, and staff-management screens.
- Renaming `/kitchen` to `/staff` (deferred).

## 2. Locked Decisions

| Decision | Choice |
| --- | --- |
| Route | `/kitchen/menu` |
| Access | `ADMIN` only; unauthenticated users redirect to `/kitchen/login` |
| Shell | Reuse `SideNav` + main content layout from `/kitchen/tables` |
| Navigation label | **Thực đơn** |
| Primary UX | One screen with category controls + menu table |
| Dish create/edit UX | Dialog with dish fields and nested option editor |
| Option UX | Managed in the dish dialog; no separate detail route in MVP |
| Availability | `isAvailable` in `PATCH /api/menu-items/{id}` |
| Image | `imageUrl` string, preview when present |
| Validation style | Client trims required text fields; BE remains source of truth |

## 3. Backend Contract

Source: `GET http://localhost:3002/api/docs/json`.

### Categories

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/categories/` | — | `{ data: { categories } }` |
| POST | `/api/categories/` | `{ name, sortOrder? }` | `{ data: { category } }` |
| PATCH | `/api/categories/{id}` | `{ name?, sortOrder? }` | `{ data: { category } }` |
| DELETE | `/api/categories/{id}` | — | `204` |

`CategoryView`:

```ts
{
  id: string
  restaurantId: string
  name: string
  sortOrder: number
}
```

### Menu items

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/menu-items/` | query `categoryId?` | `{ data: { menuItems } }` |
| POST | `/api/menu-items/` | `{ categoryId, name, price, description?, imageUrl?, isAvailable?, sortOrder? }` | `{ data: { menuItem } }` |
| PATCH | `/api/menu-items/{id}` | same fields, all optional | `{ data: { menuItem } }` |
| DELETE | `/api/menu-items/{id}` | — | `204` |

`MenuItemView`:

```ts
{
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
  sortOrder: number
}
```

### Option groups and options

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/api/menu-items/{id}/option-groups` | — | `{ data: { optionGroups } }` |
| POST | `/api/menu-items/{id}/option-groups` | `{ name, type, isRequired? }` | `{ data: { optionGroup } }` |
| PATCH | `/api/menu-items/{id}/option-groups/{groupId}` | `{ name?, type?, isRequired? }` | `{ data: { optionGroup } }` |
| DELETE | `/api/menu-items/{id}/option-groups/{groupId}` | — | `204` |
| POST | `/api/menu-items/{id}/option-groups/{groupId}/options` | `{ name, priceDelta? }` | `{ data: { option } }` |
| PATCH | `/api/menu-items/{id}/option-groups/{groupId}/options/{optionId}` | `{ name?, priceDelta? }` | `{ data: { option } }` |
| DELETE | `/api/menu-items/{id}/option-groups/{groupId}/options/{optionId}` | — | `204` |

`OptionGroupView`:

```ts
{
  id: string
  menuItemId: string
  name: string
  type: 'SINGLE' | 'MULTI'
  isRequired: boolean
  options: Array<{
    id: string
    optionGroupId: string
    name: string
    priceDelta: number
  }>
}
```

## 4. UI Design

Use a quiet admin workflow, matching `/kitchen/tables` rather than a landing
page. The first viewport shows the actual work surface.

### Page header

- Title: **Thực đơn**
- Subtitle: **Quản lý danh mục, món ăn và tùy chọn gọi món.**
- Mobile logout button consistent with current staff pages.

### Toolbar

- Search input: placeholder **Tìm món...**
- Category select/chips: **Tất cả** plus every category, sorted by `sortOrder`
  then Vietnamese name.
- Primary button: **Thêm món**.
- Secondary button: **Danh mục** opens category management.

### Menu table

Columns:

- **Món**: image thumbnail, name, description preview.
- **Danh mục**: category name.
- **Giá**: formatted VND.
- **Trạng thái**: `Còn món` / `Hết món`.
- **Tùy chọn**: count of option groups loaded for that row when known; otherwise
  show a neutral dash.
- **Thao tác**: `Sửa`, `Xóa`.

The availability toggle lives in the edit dialog and can also be exposed as a
small row action if the implementation stays simple.

### Category dialog

Compact CRUD list:

- Shows name and sort order.
- Create form: name + sort order.
- Edit inline or via small dialog.
- Delete confirmation warns that BE blocks categories with items.

### Dish dialog

Fields:

- Name, category, price, image URL, description.
- Availability checkbox.
- Sort order.
- Option editor section.

Option editor:

- Groups show name, type (`SINGLE` / `MULTI`), required flag, and nested options.
- Add/edit/delete group.
- Add/edit/delete option with name + price delta.
- Changes call BE immediately after the dish exists.
- For a new dish, create the dish first, then enable option group creation in the
  same dialog after the BE returns the new `id`.

## 5. Frontend Structure

Follow FSD conservatively:

- `src/routes/kitchen.menu.tsx` — loader gets staff session, categories, menu items.
- `src/pages/kitchen-menu/KitchenMenuPage.tsx` — page state and orchestration.
- `src/widgets/menu-admin-list/` — table, toolbar, and row actions.
- `src/widgets/menu-admin-form/` — dish dialog and option editor.
- `src/widgets/category-admin-dialog/` — category CRUD dialog.
- `src/shared/api/menu-admin.server.ts` — server-only fetch helpers.
- `src/shared/api/menu-admin.ts` — TanStack server functions.
- `src/shared/api/menu-admin-normalize.ts` — numeric/null coercion.
- `src/shared/api/types/menu-admin.ts` — admin view types.
- `src/widgets/side-nav/SideNav.tsx` — add **Thực đơn** active section.
- `src/routes/kitchen.tsx` — guard `/kitchen/menu` as `ADMIN` only.

No new entity slice is needed. This is page-specific admin CRUD plus shared API
infrastructure.

## 6. State And Data Flow

Initial loader:

```text
/kitchen/menu loader
  -> getStaffSession()
  -> listCategories()
  -> listMenuItems()
  -> KitchenMenuPage({ user, initialCategories, initialMenuItems })
```

Mutations:

- Category mutations update local `categories`, then resort.
- Dish mutations update local `menuItems`, then resort.
- Deleting a category or dish removes it locally after `204`.
- Opening edit for a dish fetches `listOptionGroups(dish.id)`.
- Option mutations refresh the selected dish's option groups after success.
- Toasts mirror existing Vietnamese copy style from table/kitchen pages.

## 7. Error Handling

Use one `MenuAdminApiError` class and map common codes/messages to Vietnamese.
When BE returns no known code, fall back to `error.message` or `Lỗi (<status>)`.

Suggested UI messages:

- Create category: **Không thêm được danh mục**
- Delete category blocked: **Danh mục đang có món, không thể xóa**
- Create dish: **Không thêm được món**
- Delete dish blocked: **Món đã từng được gọi, không thể xóa**
- Save option group: **Không lưu được nhóm tùy chọn**
- Save option: **Không lưu được tùy chọn**
- Auth/forbidden: **Bạn không có quyền truy cập**

## 8. Validation Plan

| Layer | Proof |
| --- | --- |
| Unit | normalizers coerce numeric strings/nulls; API helpers build correct paths/bodies; SideNav shows **Thực đơn** only for `ADMIN` |
| Component | menu list filters/searches; dish dialog trims fields and submits expected payload; category dialog create/edit/delete; option editor creates groups/options |
| Integration | server functions call Swagger-backed BE endpoints with staff auth store mocks |
| E2E | gated admin login -> `/kitchen/menu` -> create category -> create dish -> add option group/option -> mark unavailable -> row updates |
| Platform | n/a |

E2E uses existing admin seed credentials:

```bash
E2E_ADMIN_EMAIL=admin@demo.test
E2E_ADMIN_PASSWORD=admin-password
```

Skip cleanly when unset.

## 9. Risk & Lane

Lane: **normal**.

Reasons:

- Auth/authorization is touched by adding an admin-only route.
- Public BE contracts are consumed, but they already exist in Swagger.
- UI is a bounded admin surface inside the existing staff shell.
- No schema or backend behavior changes.

## 10. Implementation Order

1. Product doc + story row for Epic 6.
2. Admin menu types, normalizers, API helpers, and tests.
3. Route guard + `/kitchen/menu` loader skeleton + SideNav tab.
4. Menu table with search/category filtering.
5. Category CRUD dialog.
6. Dish CRUD dialog.
7. Option group/option editor inside the dish dialog.
8. Gated e2e smoke and Harness matrix/trace updates.

## 11. Open Questions

None. User selected approach 1 on 2026-07-02: one full `/kitchen/menu` admin
screen with option groups/options managed inside the dish dialog.
