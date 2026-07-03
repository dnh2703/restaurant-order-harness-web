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
