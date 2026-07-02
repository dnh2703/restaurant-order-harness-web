# US-6.2 Admin manages menu items

## Status

planned

## Lane

normal

## Product Contract

As an authenticated `ADMIN`, I create, edit, delete, search, filter, and mark
dishes available or unavailable at `/kitchen/menu`. Dish changes are scoped by
the backend session and customer menu surfaces hide or dim unavailable dishes
according to the existing customer menu contract.

## Relevant Product Docs

- `docs/product/menu-admin.md`
- `docs/superpowers/specs/2026-07-02-menu-admin-epic-6-design.md`

## Acceptance Criteria

- Authenticated `ADMIN` can open `/kitchen/menu` from sidebar tab **Thực đơn**.
- Unauthenticated users redirect to `/kitchen/login`; non-admin staff cannot
  access the menu administration screen.
- Admin can view dishes in a table with dish name, image preview, description
  preview, category, price, availability status, option-group count when known,
  and row actions.
- Admin can search dishes by text and filter by category, including **Tất cả**.
- Admin can create a dish with category, name, price, optional description,
  optional `imageUrl`, optional availability, and optional `sortOrder` through
  `POST /api/menu-items/`.
- Admin can edit dish fields through `PATCH /api/menu-items/:id`.
- Admin can delete a dish through `DELETE /api/menu-items/:id`; if the backend
  blocks deletion, the UI keeps the row and shows a clear Vietnamese error.
- Admin uses an `imageUrl` text field only; file upload is not included.
- Dish availability changes are reflected in admin rows and remain compatible
  with the customer menu unavailable-item behavior.

## Design Notes

- Route: `/kitchen/menu`.
- Shell: reuse the existing `/kitchen/*` staff shell and main content layout.
- Navigation: add **Thực đơn** for `ADMIN` only.
- Backend: Swagger-backed menu items endpoints already exist on the BE.
- UI: quiet admin workflow with toolbar search/filter, **Thêm món**, and a dish
  create/edit dialog.
- Sorting: expose numeric `sortOrder`; drag-and-drop sorting is out of scope.
- Images: `imageUrl` string input with preview when present.

## Validation

Verify command: implementation pending.

| Layer | Expected proof |
| --- | --- |
| Unit | menu item normalizers; list search/filter helpers; SideNav admin-only menu link |
| Integration | menu item server functions call Swagger-backed BE paths with staff auth store mocks |
| E2E | admin login -> `/kitchen/menu` -> create dish -> edit availability -> row updates |
| Platform | n/a (web) |
| Release | — |

## Harness Delta

- Durable story row exists for `US-6.2`.
- Design spec exists at `docs/superpowers/specs/2026-07-02-menu-admin-epic-6-design.md`.

## Evidence

Implementation pending.
