# Product: Table QR Administration (Admin)

Derived from SPEC EPIC 1 (US-1.3) and EPIC 6 (US-6.4). Defines the admin-facing
contract for managing restaurant tables and their QR codes.

## Behavior

An authenticated `ADMIN` opens the table-management screen, sees every table in
their restaurant, and can create, rename, re-capacity, or delete tables. Each
table has a server-minted `qrToken` that resolves the customer menu at
`/t/<qrToken>`. The admin can preview the QR code, download it as PNG, and print
it (including save-as-PDF via the browser print dialog). Regenerating the token
invalidates the old QR immediately.

## Actors & access

- **Actor:** `ADMIN` only on this screen. `KITCHEN` staff use `/kitchen` but cannot
  open `/kitchen/tables` (redirect back to the board). `CASHIER` uses a future
  cashier route family.
- **Auth:** reuse the **existing shared staff login** at `/kitchen/login` and the
  same httpOnly cookie session (`loginStaff`, `getStaffSession`, `withStaffAuth`).
  No separate `/admin/login`. After login, default landing stays `/kitchen` for
  all staff roles; admin reaches table management via the sidebar tab **Bàn ăn**.
- **Route prefix:** `/kitchen/*` for now. The staff shell may be renamed later
  (e.g. `/staff/*`); table management moves with it — no duplicate login or layout.
- **Tenancy:** every API call is scoped to `auth.restaurantId` on the backend;
  the FE never sends a restaurant id.

## Backend contract (implemented — US-017 on BE)

All routes are under `/api/tables`, guarded by `{ auth: ['ADMIN'] }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/tables` | List tables ordered by name |
| POST | `/tables` | Create `{ name, capacity? }` → mints `qrToken`, `status=EMPTY` |
| PATCH | `/tables/:id` | Partial update `{ name?, capacity? }` |
| POST | `/tables/:id/regenerate-qr` | Mint fresh token; old QR stops resolving |
| DELETE | `/tables/:id` | Delete when no orders reference the table |

### `TableView` shape

```ts
{
  id: string          // uuid
  name: string        // e.g. "Bàn 5"
  capacity: number | null
  qrToken: string     // server-minted, never client-supplied
  status: 'EMPTY' | 'OCCUPIED'  // read-only
}
```

### Errors the FE must surface

| Code | Status | When |
| --- | --- | --- |
| `TABLE_NOT_FOUND` | 404 | Missing or cross-tenant table |
| `TABLE_IN_USE` | 409 | Delete blocked — table has orders |
| `UNAUTHORIZED` | 401 | No/invalid session |
| `FORBIDDEN` | 403 | Non-admin role |

## Customer URL embedded in QR

The QR encodes an absolute URL:

```text
{PUBLIC_APP_ORIGIN}/t/{qrToken}
```

`PUBLIC_APP_ORIGIN` is the browser-visible origin (e.g. `http://localhost:3001`
in dev). The FE derives it from the incoming request host when rendering server-side,
or from `window.location.origin` on the client.

Scanning opens the existing customer flow (US-1.1 / US-2.1) with no changes.

## Frontend contract

- **Login:** `/kitchen/login` (unchanged). Same form for `KITCHEN` and `ADMIN`.
- **Kitchen board:** `/kitchen` (unchanged). Both `KITCHEN` and `ADMIN` may use it.
- **Table management:** `/kitchen/tables` — `ADMIN` only; others redirect to
  `/kitchen` or `/kitchen/login`.
- **Navigation:** extend the existing `SideNav` shell — tab **Bếp** (`/kitchen`) for
  all kitchen staff; tab **Bàn ăn** (`/kitchen/tables`) visible **only when
  `userRole === 'ADMIN'`**.
- Server functions in `shared/api/tables.ts`, each wrapped in `withStaffAuth`,
  proxy the BE (browser never calls BE directly).
- QR preview/download/print in `widgets/table-qr-sheet`, opened from each table row.
- Vietnamese UI copy consistent with kitchen/customer screens.

## Overlap with US-6.4

US-6.4 (CRUD tables) and US-1.3 (create/print QR) ship together on one screen.
The BE bundles both in US-017; the FE story US-1.3 covers the full admin table
surface because QR actions require table CRUD.

## Not yet covered

- Bulk table import.
- Separate numeric `number` column (BE uses `name` only).
- Admin-set `status` (system-managed by order lifecycle).
- Branded QR templates / logo overlay (future polish).
- Renaming `/kitchen` route prefix to a neutral staff namespace (deferred).
