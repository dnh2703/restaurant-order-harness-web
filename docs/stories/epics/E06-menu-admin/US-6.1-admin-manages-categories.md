# US-6.1 Admin manages menu categories

## Status

planned

## Lane

normal

## Product Contract

As an authenticated `ADMIN`, I manage my restaurant's menu categories at
`/kitchen/menu` so dishes can be organized for admin workflows and customer menu
surfaces. Category reads and writes are scoped by the backend session.

## Relevant Product Docs

- `docs/product/menu-admin.md`
- `docs/superpowers/specs/2026-07-02-menu-admin-epic-6-design.md`

## Acceptance Criteria

- Authenticated `ADMIN` can open `/kitchen/menu` and reach category management
  from the existing staff shell sidebar tab **Thực đơn**.
- Unauthenticated users redirect to `/kitchen/login`; non-admin staff cannot
  access the menu administration screen.
- Admin can view categories sorted by `sortOrder` then name.
- Admin can create a category with `name` and optional `sortOrder` through
  `POST /api/categories/`.
- Admin can edit category `name` and `sortOrder` through
  `PATCH /api/categories/:id`.
- Admin can delete an unused category through `DELETE /api/categories/:id`.
- If the backend blocks category deletion because dishes exist, the UI keeps the
  row and shows a clear Vietnamese error.
- Category changes update the local category list without requiring a full page
  reload.

## Design Notes

- Route: `/kitchen/menu`.
- Shell: reuse the existing `/kitchen/*` staff shell and sidebar layout.
- Navigation: add **Thực đơn** for `ADMIN` only.
- Backend: Swagger-backed categories endpoints already exist on the BE.
- UI: compact category panel/dialog on the same screen as the menu table.
- Sorting: expose numeric `sortOrder`; drag-and-drop sorting is out of scope.

## Validation

Verify command: implementation pending.

| Layer | Expected proof |
| --- | --- |
| Unit | category normalizers; SideNav shows **Thực đơn** only for `ADMIN` |
| Component | category dialog create/edit/delete flows, trimmed name, sort order, delete confirmation |
| Integration | category server functions call Swagger-backed BE paths with staff auth store mocks |
| E2E | admin login -> `/kitchen/menu` -> create/edit/delete category smoke flow |
| Platform | n/a (web) |
| Release | — |

## Harness Delta

- Durable story row exists for `US-6.1`.
- Design spec exists at `docs/superpowers/specs/2026-07-02-menu-admin-epic-6-design.md`.

## Evidence

Implementation pending.
