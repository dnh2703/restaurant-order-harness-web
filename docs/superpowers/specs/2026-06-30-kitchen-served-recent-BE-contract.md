# BE handoff — `GET /api/kitchen/served-recent`

Date: 2026-06-30
For: `restaurant-order-harness-server` (BE team)
Requested by: FE EPIC 4 (Kitchen screen). FE design:
`2026-06-30-kitchen-screen-e04-design.md`.

## Why
The Kitchen screen has a third column **`Đã xong`** (recently served). The existing
`GET /api/kitchen/queue` returns only `PENDING` + `COOKING`, and `order_items` has no
serve timestamp, so "recently served, newest first" cannot be queried today. The FE needs a
durable source for this column.

## 1. Schema change — `served_at` on `order_items`
- Add a nullable column `served_at timestamptz` (Drizzle: `servedAt timestamp({ withTimezone: true })`).
- When an item transitions to `SERVED` (in the existing `advanceItemStatus` / status PATCH),
  set `served_at = now()` in the same `UPDATE`. Leave it untouched for other transitions.
- Add an index to support the query below, e.g. on `(status, served_at)`.
- Migration required (Drizzle).

## 2. Endpoint
```
GET /api/kitchen/served-recent
```
- **Auth:** same guard as the other kitchen routes — `{ auth: ['KITCHEN', 'ADMIN'] }`.
  Returns `401 UNAUTHORIZED` without a token, `403 FORBIDDEN` for a `CASHIER` token.
- **Tenancy:** scoped to the caller's `auth.restaurantId` (never trust the request body) —
  join `order_items → orders → tables`, filter `orders.restaurant_id = auth.restaurantId`.
- **Filter:** `status = 'SERVED'` AND `served_at >= now() - interval '30 minutes'`.
- **Order:** `served_at DESC, id` (newest first).
- **Limit:** 50.
- Stitch options from `order_item_options` in a second query, like `getKitchenQueue` does.

### Response
```jsonc
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "tableName": "Bàn 5",
        "nameSnapshot": "Phở bò",
        "quantity": 2,
        "note": "ít hành",        // string | null
        "status": "SERVED",
        "servedAt": "2026-06-30T10:21:05.000Z",  // ISO string
        "options": [
          { "optionName": "Thêm trứng", "priceDelta": 5000 }
        ]
      }
    ]
  }
}
```
This mirrors the `queueItem` shape used by `/api/kitchen/queue`, with `createdAt` replaced by
`servedAt` and `status` fixed to `SERVED`. Add the TypeBox response schema next to the existing
`queueItem` schema in `src/presentation/http/routes/kitchen.ts`.

## 3. Suggested implementation shape
- Service: `src/application/kitchen/get-served-recent.ts`, mirroring `get-queue.ts`.
- Route: add `.get('/served-recent', ...)` to the kitchen routes under the same guard.

## 4. Tests to add
Mirror `test/kitchen/kitchen-routes.integration.test.ts` / `kitchen-queue.integration.test.ts`:
- Returns SERVED items newest-first, scoped to the caller's restaurant.
- Excludes items served more than 30 minutes ago; respects the limit of 50.
- `401` without a token; `403` for a `CASHIER` token.
- `advanceItemStatus` stamps `served_at` on the `SERVED` transition and leaves it null otherwise.

## Notes for the FE
- The FE ships without this endpoint: until it is live, the `Đã xong` column falls back to an
  in-session list of items served on that device. Once the endpoint returns data, the column
  becomes durable with no FE change.
- No change needed to `/api/kitchen/queue`, the status PATCH response, or the SSE stream.
