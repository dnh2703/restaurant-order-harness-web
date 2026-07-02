# US-1.3 Admin creates and prints table QR codes

## Status

implemented

## Lane

normal

## Product Contract

As an Admin, I manage my restaurant's tables and create/print a QR code for each
one so customers can scan and open the correct table menu. Each table has a
unique server-minted token; I can regenerate the token (invalidating the old QR)
and export the code as PNG or print it (PDF via browser print).

## Relevant Product Docs

- `docs/product/table-qr-admin.md`
- `docs/product/menu-browsing.md` (customer `/t/<qrToken>` entry — unchanged)

## Acceptance Criteria

- Authenticated `ADMIN` sees a table list at `/kitchen/tables` with name,
  capacity, status, and QR actions.
- Admin reaches the screen via shared login `/kitchen/login` and the sidebar tab
  **Bàn ăn** (no separate admin login).
- Creating a table (`name`, optional `capacity`) mints a `qrToken` via
  `POST /api/tables` and shows the new row with QR preview.
- Editing renames or updates capacity via `PATCH /api/tables/:id`.
- Deleting removes an unused table; if the table has orders, show
  `TABLE_IN_USE` (409) and keep the row.
- Regenerating calls `POST /api/tables/:id/regenerate-qr`, updates the displayed
  token/QR, and the old token no longer resolves on `/t/<oldToken>`.
- QR preview encodes `{origin}/t/{qrToken}`; admin can **Tải PNG** (download) and
  **In mã** (print / save-as-PDF).
- `KITCHEN` role cannot access `/kitchen/tables` (redirect to `/kitchen`).
  Unauthenticated users redirect to `/kitchen/login`.
- Admin can still use `/kitchen` (board) unchanged — no duplicate kitchen screen.
- Customer QR flow (`/t/$qrToken`) is unchanged for valid tokens.

## Design Notes

- **Design spec:** `docs/superpowers/specs/2026-07-01-admin-table-qr-design.md`
- **BE dependency:** US-017 (merged on `restaurant-order-harness-server`) — no BE
  work in this story.
- **Auth (approach A — locked):** shared staff login at `/kitchen/login`; extend
  `/kitchen` layout guard so `/kitchen/tables` requires `role === 'ADMIN'`.
  Post-login default remains `/kitchen` for all roles.
- **Nav:** extend `widgets/side-nav` — **Bếp** + **Bàn ăn** (admin-only tab).
- **API (server fns):** `listTables`, `createTable`, `updateTable`,
  `deleteTable`, `regenerateTableQr` → proxy `/api/tables/*` via `withStaffAuth`.
- **QR rendering:** client-side with the `qrcode` npm package (PNG data URL); no
  server-side image generation.
- **Print:** dedicated `@media print` stylesheet on a print-friendly QR layout;
  PDF = browser print dialog → Save as PDF.
- **UI surfaces (FSD):**
  - `pages/kitchen-tables/KitchenTablesPage`
  - `widgets/kitchen-table-list/` (list + row actions)
  - `widgets/table-qr-sheet/` (preview, download, print, regenerate confirm)
  - `entities/table/admin-model.ts` (admin `TableView` type + normalizers)
  - `shared/api/tables.ts`
  - routes: extend `kitchen.tsx` guard; add `kitchen.tables.tsx`
- **Env for e2e:** `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (seed:
  `admin@demo.test` / `admin-password`).

## Validation

Verify command: `bun run validate`.

| Layer | Expected proof |
| --- | --- |
| Unit | table normalizers; QR URL builder; row action handlers (mock API); QR sheet download/print triggers; SideNav shows Bàn ăn only for ADMIN |
| Integration | server fn ↔ BE round-trip for list/create/regenerate/delete; KITCHEN blocked from `/kitchen/tables` |
| E2E | `/kitchen/login` as admin → Bàn ăn → create table → `/t/<newToken>` works; regenerate invalidates old token |
| Platform | n/a (web) |
| Release | — |

E2E gates on `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` and a running seeded BE
(same pattern as `E2E_QR_TOKEN` / `E2E_KITCHEN_*`).

## Harness Delta

- Created `docs/product/table-qr-admin.md`.
- Created design spec `docs/superpowers/specs/2026-07-01-admin-table-qr-design.md`.
- Recorded intake + story in harness durable layer.
- Updated `docs/stories/backlog.md` with E01 epic entry.
- Revised design: shared `/kitchen/login`, route `/kitchen/tables`, sidebar **Bàn ăn**.

## Evidence

- `bun run validate` → 142/142 unit tests pass.
- `bun run build` → includes `/kitchen/tables` route.
- E2E: `e2e/kitchen-tables.spec.ts` gates on `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`.
