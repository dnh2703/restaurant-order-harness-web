# Design — US-1.3: Admin Table QR (E01)

Date: 2026-07-01
Status: **approved**
Repo touched: `restaurant-order-harness-web` (FE only)
BE: **already implemented** as US-017 on `restaurant-order-harness-server` — FE
codes against the existing `/api/tables` contract (see
`docs/product/table-qr-admin.md`).

## 1. Goal & scope

Build the admin-facing table management screen for EPIC 1 / EPIC 6:

- **US-1.3** — create/print a QR for each table; regenerate token; export PNG /
  print (PDF via browser).
- **US-6.4** (bundled) — CRUD tables (name, capacity). `status` and `qrToken` are
  read-only from the admin's perspective except via regenerate.

### In scope

- Extend the existing `/kitchen/*` staff shell — **no new login route**.
- Table list + create/edit/delete UI at **`/kitchen/tables`** (`ADMIN` only).
- Sidebar tab **Bàn ăn** on `SideNav`, visible only when `userRole === 'ADMIN'`.
- QR preview sheet per table: show code, copy link, download PNG, print, regenerate
  with confirmation.
- Server functions proxying BE `/api/tables/*` through `withStaffAuth`.
- Unit + integration tests; optional e2e gated on admin seed credentials.

### Out of scope

- BE changes (US-017 is done).
- Separate `/admin/login` or duplicate staff shell.
- Duplicate kitchen board for admin (admin uses existing `/kitchen`).
- Renaming `/kitchen` route prefix (deferred — rename staff namespace later if needed).
- Cashier/admin menu or reports screens.
- Branded QR templates, bulk import, separate table-number column.
- Server-side QR image generation or a dedicated PDF library — client-side only.

## 2. Decisions (locked)

| Decision | Choice |
| --- | --- |
| BE contract | Reuse US-017 `/api/tables` as-is |
| Auth | Reuse kitchen staff-auth cookies + `withStaffAuth` (shared session) |
| Login route | **`/kitchen/login` only** — no `/admin/login` |
| Post-login default | **`/kitchen`** for all roles (unchanged) |
| Table screen route | **`/kitchen/tables`** — `ADMIN` only |
| Staff nav | Extend `SideNav`: **Bếp** + **Bàn ăn** (admin-only second tab) |
| Route prefix rename | Deferred (`/kitchen` → neutral name later) |
| QR payload URL | `{origin}/t/{qrToken}` — same entry as customer flow |
| QR image | Client-side `qrcode` package → canvas/data-URL PNG |
| PDF export | Browser print dialog (`window.print`) with print CSS — no `jspdf` |
| Regenerate UX | Confirm dialog warning old QR stops working; then refresh row + sheet |
| Delete guard | Surface BE `409 TABLE_IN_USE` with Vietnamese toast/message |
| Layout | Reuse kitchen staff shell (`SideNav` + main content area) |

## 3. Staff navigation & access flow

```text
/kitchen/login          ← shared staff login (KITCHEN + ADMIN + future CASHIER*)
        │
        ├─ KITCHEN ──► /kitchen              (board only; no Bàn ăn tab)
        │
        └─ ADMIN ────► /kitchen              (default after login, unchanged)
                   ├─ sidebar: Bếp ────────► /kitchen
                   └─ sidebar: Bàn ăn ─────► /kitchen/tables  (ADMIN only)

* CASHIER today: login form shown; guard rejects → no loop (existing behavior).
```

**Guard rules** (extend `src/routes/kitchen.tsx` `beforeLoad`):

| Path | Session | Role | Result |
| --- | --- | --- | --- |
| `/kitchen/login` | any | any | Public (existing) |
| `/kitchen/tables` | none | — | → `/kitchen/login` |
| `/kitchen/tables` | yes | not `ADMIN` | → `/kitchen` |
| `/kitchen/tables` | yes | `ADMIN` | Allow |
| `/kitchen`, `/kitchen/` | none | — | → `/kitchen/login` |
| `/kitchen`, `/kitchen/` | yes | `KITCHEN` or `ADMIN` | Allow (existing) |

## 4. Backend contract (existing — no FE changes required on BE)

Mounted at `/api/tables`, `{ auth: ['ADMIN'] }`. Full detail in
`docs/product/table-qr-admin.md` and BE spec
`restaurant-order-harness-server/docs/superpowers/specs/2026-06-28-us-017-tables-crud-design.md`.

Verified behaviors the FE relies on:

- `POST /tables` mints `qrToken` with `crypto.randomUUID()`.
- `POST /tables/:id/regenerate-qr` replaces token; old token → `404` on
  `GET /api/qr/:oldToken`.
- `DELETE /tables/:id` → `204` or `409 TABLE_IN_USE`.
- List ordered by `name`.

## 5. Frontend changes

Follows FSD + existing server-fn proxy patterns (kitchen, customer QR).

### 5.1 Types & API

- `src/shared/api/types/admin-table.ts` — `AdminTableView` mirroring BE `TableView`.
- `src/shared/api/tables.ts` — server-fns wrapped in `withStaffAuth`:
  - `listTables()` → `GET /api/tables`
  - `createTable({ name, capacity? })` → `POST /api/tables`
  - `updateTable({ id, name?, capacity? })` → `PATCH /api/tables/:id`
  - `deleteTable({ id })` → `DELETE /api/tables/:id`
  - `regenerateTableQr({ id })` → `POST /api/tables/:id/regenerate-qr`
- Export tested helpers `fetchTables`, `fetchCreateTable`, etc. for unit tests
  (same pattern as `fetchOrder` in `order.ts`).

### 5.2 Routes & guard

- **Modify** `src/routes/kitchen.tsx` — add `/kitchen/tables` ADMIN-only branch in
  `beforeLoad` (see §3). Continue providing `{ session }` to children.
- **Create** `src/routes/kitchen.tables.tsx` → `KitchenTablesPage`.
- **Do not create** `admin.tsx`, `admin.login.tsx`, or `admin.tables.tsx`.

### 5.3 SideNav

- **Modify** `src/widgets/side-nav/SideNav.tsx`:
  - Keep **Bếp** → `/kitchen` (all roles that use this shell).
  - Add **Bàn ăn** → `/kitchen/tables` when `userRole === 'ADMIN'`.
  - Highlight active tab from current pathname (`/kitchen` vs `/kitchen/tables`).
  - Use TanStack Router `Link` instead of raw `<a href>` where practical.

### 5.4 UI components

- `src/pages/kitchen-tables/KitchenTablesPage.tsx` — table list; reuses staff shell
  layout pattern from `KitchenScreenPage` (`SideNav` + main).
- `src/widgets/kitchen-table-list/KitchenTableList.tsx` — responsive table/cards:
  columns Name, Capacity, Status, Actions (Sửa, Xóa, Mã QR).
- `src/widgets/kitchen-table-list/CreateTableForm.tsx` — inline or modal create.
- `src/widgets/table-qr-sheet/TableQrSheet.tsx` — drawer/sheet showing:
  - QR image (from `qrcode.toDataURL(url)`)
  - Human-readable link + copy button
  - **Tải PNG** — `<a download="ban-{name}.png" href={dataUrl}>`
  - **In mã** — opens print view or calls `window.print()` on a print-only subtree
  - **Tạo lại mã** — confirm → `regenerateTableQr` → refresh QR + list row
- `src/shared/lib/table-qr-url.ts` — `buildTableQrUrl(origin, qrToken): string`
  (unit-tested).

### 5.5 QR / print implementation notes

- Add dependency: `qrcode` (+ `@types/qrcode` if needed).
- Error correction level `M`, margin 2, width ~256px for screen / ~512px for print.
- Print stylesheet (`@media print`): hide chrome, center QR + table name + URL.
- PDF: document in UI as "In / Lưu PDF" — uses native browser Save as PDF.

### 5.6 Error mapping

Map BE `{ error: { code } }` to Vietnamese user messages:

| Code | Message (suggested) |
| --- | --- |
| `TABLE_NOT_FOUND` | Không tìm thấy bàn |
| `TABLE_IN_USE` | Bàn đang có đơn, không thể xóa |
| `UNAUTHORIZED` | Phiên đăng nhập hết hạn |
| `FORBIDDEN` | Bạn không có quyền truy cập |

## 6. Validation plan

| Layer | Proof |
| --- | --- |
| Unit | `buildTableQrUrl`; API normalizers; SideNav admin tab visibility; create/edit/delete/regenerate handlers (mocked fetch); TableQrSheet renders QR + action buttons |
| Integration | `fetchTables` / `fetchCreateTable` / `fetchRegenerateTableQr` against running BE; KITCHEN session blocked from `/kitchen/tables` loader/guard |
| E2E | `/kitchen/login` as admin → **Bàn ăn** → create "Bàn E2E" → `/t/<token>` shows menu → regenerate → old URL 404, new URL works |
| Platform | n/a |

E2E env (`.env.example`):

```bash
E2E_ADMIN_EMAIL=admin@demo.test
E2E_ADMIN_PASSWORD=admin-password
```

Skip cleanly when unset (CI-safe), mirroring `E2E_QR_TOKEN`.

## 7. Risk & lane

| Risk flag | Applies? |
| --- | --- |
| Auth | yes — shared staff login |
| Authorization | yes — `ADMIN` only on `/kitchen/tables` |
| Data model | no — FE only |
| Public contracts | yes — consumes `/api/tables` |
| Cross-platform | no |
| Existing behavior | minimal — extends kitchen guard + SideNav only |
| Weak proof | yes — new area |
| Multi-domain | no |

**Lane: normal** — bounded screen inside existing staff shell; BE contract stable (US-017).

## 8. Implementation order (suggested)

1. Types + `shared/api/tables.ts` + unit tests for fetch helpers.
2. Extend `kitchen.tsx` guard + add `kitchen.tables.tsx` skeleton with `SideNav`.
3. SideNav: **Bàn ăn** tab for ADMIN.
4. Table list + create/edit/delete wired to BE.
5. QR sheet (preview, download, print, regenerate).
6. E2E spec `e2e/kitchen-tables.spec.ts`.

## 9. Open questions

None — approach A approved 2026-07-01.
