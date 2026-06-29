# Design — Web Customer Ordering (Gọi món QR · bản web)

Source design: `App Khách - Gọi món QR (Web).dc.html` (Claude Design handoff).
Decision: implement **incrementally by story**, **responsive** (desktop layout
from the mock; mobile collapses to one column + cart sheet/bottom bar).

## Goal

Rebuild the customer QR-ordering web experience to match the handoff design,
wired to the real Elysia backend. The mock is desktop-first (1280px grid + a
360px cart sidebar); we recreate it responsively and replace the current
mobile-only single-column menu (US-2.1 v1).

## Scope

**Phase 1 — Menu + Cart screen** (this spec's focus):

| Story | What | BE contract |
| --- | --- | --- |
| US-2.1 (redesign) | Desktop 2-col shell + 3-col dish grid, responsive, wired | `GET /api/qr/:token`, `GET /api/qr/:token/menu` |
| US-2.2 | Search by name (diacritic-insensitive) + category chip filter | client-side; URL search params `?q=&cat=` |
| US-3.1 | Cart: add to cart, qty stepper, remove, live subtotal | client state |
| US-3.2 | "Gửi bếp" → submit cart to the open order | `POST /api/qr/:token/order-items` |

**Phase 2 — Order tracking screen** (deferred, outlined only):
US-3.3 (live item statuses via SSE `GET /api/qr/:token/stream`), US-3.4 (Gọi
phục vụ / Thanh toán). Not built in Phase 1.

## Design System (extracted from the mock)

- **Font:** Be Vietnam Pro (400/500/600/700/800). Load via Google Fonts.
- **Colors:** ink `#102A43`, blue `#2563EB`, blue-bg `#E8F0FE`, blue-border
  `#CFE0FB`, page bg `#F1F4F9`, card `#FFFFFF`, border `#E6EAF1` / `#EEF1F6`,
  muted text `#8A8E99`, secondary text `#4F535D` / `#757983`, success badge bg
  `#E9F0E4` text `#5B7A3E`.
- **Radii:** card 18px, chip/control 12px, button 14px, image 12–18px.
- **Shadows:** card `0 12px 30px -22px rgba(16,42,67,.4)`; panel
  `0 40px 90px -34px rgba(16,42,67,.45)`.
- **Money:** `159.000đ` — thousands separators + small `đ` suffix. Reuse/extend
  `shared/lib/format.formatVND` (already does `vi-VN` grouping).

These become Tailwind theme tokens (`@theme` in `styles.css`) so we never
hardcode hex in components. The browser-chrome frame in the mock is a canvas
artifact, **not** part of the app — omit it.

## Responsive strategy

- `≥ lg` (desktop): two columns — scrollable menu (left) + sticky cart sidebar
  (right, ~360px). Dish grid `lg:grid-cols-3`.
- `< lg` (mobile/tablet): single column; dish grid `grid-cols-1 sm:grid-cols-2`.
  Cart becomes a bottom bar (count + total + "Xem giỏ") that opens a sheet.
- Reuse the existing `widgets/menu-list` concept but the card is the new design's
  grid card, not the current list row.

## FSD layer plan (Phase 1)

```
entities/
  cart/model.ts          CartLine, cart math (subtotal); pure, unit-tested
pages/customer-menu/
  CustomerMenuPage.tsx   composes nav + menu + cart, holds page state
widgets/
  top-nav/               logo + restaurant + search box + table badge
  menu-grid/             category chips + section header + dish card grid
  cart-panel/            cart lines + steppers + totals + "Gửi bếp"
features/
  add-to-cart/           add / inc / dec / remove actions on cart state
  submit-order/          POST order-items via createServerFn, clears cart
shared/
  lib/diacritics.ts      VN diacritic-insensitive normalize (unit-tested)
  api/order.ts           submitOrderItems server fn
```

## Per-story behavior

### US-2.1 (redesign)
- Replace mobile list with the design's nav + dish grid + (empty) cart shell.
- Dish card: image (fallback "Ảnh" placeholder when `imageUrl` null), name,
  description (2-line clamp), `formatVND(price)`, `+` button.
- Sold-out (`!isAvailable`): card dimmed, `+` disabled, "Hết hàng" label
  (carry over US-2.1 v1 rule). Section header shows current category name +
  item count (e.g. "Tất cả · 12 món").
- Invalid/expired token → existing "Invalid table" screen (unchanged).

### US-2.2
- Search box filters dish name, **diacritic-insensitive** ("pho" matches "Phở").
- Category chips single-select; "Tất cả" default. Filter (hide non-matching),
  not scroll-to.
- State in URL: `?q=<text>&cat=<categoryId|all>` (TanStack Router search params),
  so reload/share keeps the filter. Empty-result state message.

### US-3.1
- `+` on a card adds the dish (qty 1) to cart; card badge shows its cart qty.
- Cart line: thumbnail, name, line price, `− qty +` stepper; qty 0 removes.
- Live subtotal. Discount row + discount-code input are **visual-only/deferred**
  (customer discount is a cashier concern, US-5.3) — render disabled, no logic.
- Cart held in page/client state for now (no persistence across reload in P1).

### US-3.2
- "Gửi bếp · <total>" → `POST /api/qr/:token/order-items` with
  `{ items: [{ menuItemId, quantity }] }` (no options/notes in P1).
- On success: cart clears, confirmation shown. On error: inline error, cart kept.
- Options/notes (US-2.3) are out of P1 scope — grid `+` adds base item only.

## Out of scope (Phase 1)
- Promo banner is static/decorative (no BE offers) — render as-is, not wired.
- Discount code logic, options/toppings (US-2.3), order-tracking screen (P2),
  realtime (P2), cart persistence.

## Validation (per story, Harness)
- Unit (vitest): `diacritics` normalize, cart math, filter/grouping logic.
- Integration (playwright): existing invalid-token; add search-filters-list and
  add-to-cart-updates-total against seeded/stubbed data.
- Each story updates its Harness story packet + `harness-cli story update`.

## Open questions for reviewer
1. Mobile cart: bottom-bar + sheet OK, or prefer a separate `/gio` route?
2. Keep the promo banner at all, or drop it until offers exist on the BE?
