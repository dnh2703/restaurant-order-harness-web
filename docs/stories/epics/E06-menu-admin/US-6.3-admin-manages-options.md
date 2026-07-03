# US-6.3 Admin manages menu item option groups and options

## Status

planned

## Lane

normal

## Product Contract

As an authenticated `ADMIN`, I manage option groups and options for a dish inside
the `/kitchen/menu` dish dialog so customer choices such as size, toppings, or
required selections are configured with the menu item. Option writes are scoped
by the backend session through the selected dish.

## Relevant Product Docs

- `docs/product/menu-admin.md`
- `docs/superpowers/specs/2026-07-02-menu-admin-epic-6-design.md`

## Acceptance Criteria

- Authenticated `ADMIN` manages option groups/options from the dish create/edit
  dialog on `/kitchen/menu`; there is no separate option management route.
- Unauthenticated users redirect to `/kitchen/login`; non-admin staff cannot
  access the menu administration screen.
- Opening an existing dish for edit loads its option groups from
  `GET /api/menu-items/:id/option-groups`.
- Admin can create, edit, and delete option groups with `name`, `type`
  (`SINGLE` or `MULTI`), and `isRequired`.
- Admin can create, edit, and delete nested options with `name` and optional
  `priceDelta`.
- For a new dish, option group creation is enabled only after the dish is
  created and the backend returns a dish `id`.
- Option group and option changes refresh the selected dish's option state after
  success and show clear Vietnamese errors on failure.

## Design Notes

- Route: `/kitchen/menu`.
- Shell: reuse the existing `/kitchen/*` staff shell and main content layout.
- Backend: Swagger-backed option groups/options endpoints already exist on the
  BE.
- UI: option editor lives inside the dish dialog.
- Option group types: `SINGLE` and `MULTI`.
- Options: use `priceDelta`; no separate public admin namespace is introduced.

## Validation

Verify command: implementation pending.

| Layer | Expected proof |
| --- | --- |
| Unit | option group/option normalizers; option editor create/edit/delete handlers |
| Component | option editor creates/updates/deletes option groups and options inside dish dialog |
| Integration | option group and option server functions call Swagger-backed BE paths with staff auth store mocks |
| E2E | admin login -> `/kitchen/menu` -> create dish -> add option group and option -> row/detail state updates |
| Platform | n/a (web) |
| Release | — |

## Harness Delta

- Durable story row exists for `US-6.3`.
- Design spec exists at `docs/superpowers/specs/2026-07-02-menu-admin-epic-6-design.md`.

## Evidence

Implementation pending.
