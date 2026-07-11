# shadcn-style Date Range Picker — Design

- **Date:** 2026-07-04
- **Branch:** continues on `feat/reports-e07` (this enhances the Reports `DateRangeControl`; E07 PR #15 is still open). Can be split to its own branch if preferred.
- **Scope:** Frontend. Add reusable `shared/ui` primitives (`Popover`, `Calendar`, `DateRangePicker`) modeled on shadcn/ui, then wire `DateRangePicker` into the Reports `DateRangeControl` in place of the two native `<input type="date">`.

## 1. Goal

Replace the native date inputs in `DateRangeControl` with a shadcn-style date **range** picker: a button trigger that opens a Popover containing a two-month calendar where the user selects a start and end date in one gesture. The preset buttons (Hôm nay / 7 ngày / 30 ngày) stay. The calendar and popover are built as generic `shared/ui` primitives so other stories (e.g. US-3.4, future reports filters) can reuse them.

## 2. Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Calendar engine | **`react-day-picker` v9** (new dependency) | shadcn's Calendar *is* a react-day-picker wrapper. Robust: keyboard nav, `vi` locale, month/range modes, edge cases handled. `date-fns` comes transitively (used for locale + date math). |
| Popover | **existing `radix-ui`** unified package (`Popover`) | Already a dependency (used by Select/Dialog). No new dep for the popover layer. Animations via `tw-animate-css` (already imported in `styles.css`). |
| Range UX | **one range calendar** (`mode="range"`, `numberOfMonths={2}`) | Faithful shadcn "date range picker" pattern; picks from+to together. Presets kept alongside. |
| Reusability | primitives live in **`shared/ui`** | Matches the kit conventions (shadcn-style wrappers over radix, exported from `index.ts`). |
| Preset active state | active preset → `Button variant="primary"` (**brand blue `#2563eb`, white text**) + `aria-pressed`; inactive → `secondary` | User request: the Hôm nay / 7 ngày / 30 ngày buttons must show their active state in brand color. |
| Label formatting | `Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })` | No extra formatting dep; consistent VN locale. |
| App data shape | keep `DateRange = { from: string; to: string }` (ISO `YYYY-MM-DD`) | The rest of E07 (server fns, normalizer) speaks ISO strings; the picker converts ISO↔`Date` at its boundary only. |

**New dependency:** `react-day-picker@^9` (+ its transitive `date-fns`). This is a deliberate exception to E07's "no new dependency" rule — the user explicitly asked for a shadcn date picker, which is defined by react-day-picker.

## 3. Architecture (FSD — all in `shared/ui`)

```
src/shared/ui/Popover.tsx          # wraps radix-ui Popover: Root/Trigger/Content/Anchor
src/shared/ui/Calendar.tsx         # wraps react-day-picker DayPicker, shadcn classNames + Phosphor nav icons + vi locale
src/shared/ui/DateRangePicker.tsx  # Popover + trigger Button + Calendar(mode=range); ISO<->Date at the boundary
src/shared/ui/index.ts             # export the three
```

Edits:
- `src/shared/lib/date-range.ts` — add two pure converters: `isoToDate(iso: string): Date` and `dateToISO(d: Date): string` (reuse the existing local `toISODate` logic; keep symmetric with `addDays`/`todayISO`, all local-time). Add a pure `matchPreset(value: DateRange): RangePreset | null` that returns which preset (if any) the current range equals — used for the active-state highlight below.
- `src/widgets/date-range-control/DateRangeControl.tsx` — replace the two `<input type="date">` (and their clamp handlers) with a single `<DateRangePicker value={value} onChange={onChange} />`. **Preset buttons get an active state:** compute the active preset with `matchPreset(value)`; the matching button renders `variant="primary"` (brand blue `bg-brand text-white`) with `aria-pressed={true}`, the others render `variant="secondary"` with `aria-pressed={false}`. A custom range (picked via the calendar) matches no preset, so all presets show the inactive `secondary` style.
- `src/shared/ui/index.ts` — add exports.
- `package.json` — add `react-day-picker`.

### Component contracts

- **Popover** — thin re-exports of radix `Popover.Root` / `Trigger` / `Content` / `Anchor`, with `PopoverContent` styled (bg, border, rounded, shadow, `z`, `tw-animate-css` `data-[state]` in/out animations, `align`/`sideOffset` props). Mirrors how `Dialog.tsx` re-exports radix.
- **Calendar** — `props: ComponentProps<typeof DayPicker>` passthrough with defaults: `locale={vi}` (from `date-fns/locale`), `showOutsideDays`, Phosphor `CaretLeftIcon`/`CaretRightIcon` as the nav components, and a `classNames` map adapted to the project's Tailwind tokens (brand selection color, `rounded-control`, `text-ink`/`text-muted`, hover `bg-page`). No react-day-picker CSS import — fully Tailwind-styled (shadcn v9 approach).
- **DateRangePicker** — `props: { value: DateRange; onChange: (r: DateRange) => void; className?: string }`.
  - Trigger: a `secondary` `Button` showing `CalendarBlankIcon` + a formatted label: `"{from} – {to}"` (each `Intl`-formatted); if `from === to`, show a single date.
  - Content: `<Calendar mode="range" numberOfMonths={2} selected={{ from: isoToDate(value.from), to: isoToDate(value.to) }} onSelect={...} defaultMonth={isoToDate(value.from)} />`.
  - `onSelect(range)`: when both `range.from` and `range.to` are present, emit `onChange({ from: dateToISO(range.from), to: dateToISO(range.to) })` and close the popover. While only `from` is picked, hold the partial selection internally (do not emit yet). If the user reopens without completing, fall back to `value`.

## 4. Data flow

`DateRangeControl` state (ISO `DateRange`) → `DateRangePicker` converts to `Date` range for react-day-picker → user picks → converts back to ISO → `onChange` bubbles the ISO range up → `ReportsScreenPage` refetches (unchanged). Presets still call `onChange(presetRange(id))` directly. No change below the widget layer.

## 5. Testing

**Unit (Vitest):**
- `date-range` converters: `isoToDate`/`dateToISO` round-trip (`dateToISO(isoToDate('2026-07-04')) === '2026-07-04'`), month/year boundaries, symmetry with existing helpers.
- `DateRangePicker`:
  - Renders the trigger with the formatted current range label.
  - Opening the popover shows the calendar (role/grid present).
  - Selecting a start then end day calls `onChange` once with the correct ISO `{from,to}` and closes. (Drive via Testing Library `userEvent`/`fireEvent` on day cells by accessible name.)
  - Picking only a start day does **not** emit yet.
- `matchPreset`: returns the right `RangePreset` for a range equal to `presetRange(id)`, and `null` for a custom range.
- `DateRangeControl` (update existing test): presets still emit `presetRange(...)`; the widget renders a `DateRangePicker` (assert the trigger label reflects `value`) instead of the old `Từ`/`Đến` inputs; **the active preset is highlighted** — when `value === presetRange('7d')` (the default), the "7 ngày" button has `aria-pressed="true"` and the others `aria-pressed="false"`; a custom range leaves all presets `aria-pressed="false"`. Remove the now-obsolete clamp-input assertions (clamping is inherent to range selection now).

**Popover / Calendar** are thin wrappers → a light render smoke each (renders children / renders a month grid). Keep assertions real, not tautological.

**Env note:** react-day-picker renders fine under happy-dom/jsdom via Testing Library. If a specific interaction (e.g. `numberOfMonths={2}` month navigation) proves flaky in the test env, assert on the single-month behavior and the `onChange` contract rather than pixel layout.

**Full suite:** `bun run validate` (typecheck + all Vitest) and `bun run lint:fsd` must stay clean. `bun install` for the new dep (via Bun only — repo enforces Bun).

## 6. Non-goals

- Time-of-day / datetime picking (date only).
- Min/max date bounds, disabled dates, or "no future dates" rules (could be a later refinement).
- Replacing native date inputs anywhere outside `DateRangeControl`.
- A separate single-date `DatePicker` export (not needed yet — YAGNI; the range picker covers the current use). Add later if a single-date use appears.
- Theming beyond the existing Tailwind tokens.

## 7. Risks / notes

- **Bundle size:** react-day-picker + date-fns add to the client bundle. Acceptable given the explicit shadcn requirement; date-fns is tree-shakeable and only the `vi` locale + used functions are pulled.
- **SSR:** the picker is client-interactive; the trigger label is derived from `value` (deterministic) so no hydration mismatch beyond the pre-existing `date-range.ts` local-time note from the E07 review.
- **react-day-picker v9 API** differs from v8 (prop names, `classNames` keys). The plan will pin `^9` and use the v9 `classNames`/`components` API.
