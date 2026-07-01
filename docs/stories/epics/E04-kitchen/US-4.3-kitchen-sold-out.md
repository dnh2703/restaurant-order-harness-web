# US-4.3 Kitchen marks dish temporarily sold out

## Status

implemented

## Lane

normal

## Product Contract

As Kitchen staff, I mark a dish as temporarily sold out from the **Hết món** panel.
The dish is hidden from the customer menu until marked available again.

## Relevant Product Docs

- `docs/product/kitchen-screen.md`

## Acceptance Criteria

- **Hết món** button opens a panel listing menu items with availability toggles.
- Toggling to unavailable calls the availability PATCH endpoint.
- Customer menu dims/hides unavailable dishes (existing US-2.1 behavior).
- Re-opening the panel clears stale menu items before fetching fresh data.

## Design Notes

- Server fns: `listMenuItemsForKitchen`, `setMenuItemAvailability`.
- UI: `SoldOutPanel` widget on `KitchenScreenPage`.

## Validation

| Layer | Expected proof | Current |
| --- | --- | --- |
| Unit | panel render + availability PATCH | ✅ SoldOutPanel.test; kitchen.test setAvailability |
| Integration | page opens panel and loads menu items | ✅ KitchenScreenPage sold-out panel test |
| E2E | toggle sold-out → customer menu hides dish | ❌ not covered (manual verification in E04 plan Step 4) |
| Platform | n/a | n/a |

Proof: unit=1, integration=1, e2e=0.

## Harness Delta

- Registered US-4.3 in durable matrix after PR #6 merge.

## Evidence

- `npm run validate` → 122/122 vitest.
- Merged via PR #6 (`9287768`).
