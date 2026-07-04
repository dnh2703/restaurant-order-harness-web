# shadcn Date Range Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable shadcn-style `Popover`, `Calendar`, and `DateRangePicker` primitives to `shared/ui`, then use `DateRangePicker` in the Reports `DateRangeControl` (replacing the native date inputs) and give the preset buttons a brand-colored active state.

**Architecture:** `Popover` wraps the existing `radix-ui` Popover (no new dep). `Calendar` wraps `react-day-picker` v9 (new dep) styled with the project's Tailwind tokens. `DateRangePicker` composes them with a styled trigger and converts between the app's ISO `DateRange` and react-day-picker's `Date` range at its boundary. All pure date logic lives in `shared/lib/date-range.ts` and is unit-tested there; the components get thin render/interaction tests.

**Tech Stack:** TanStack Start (React 19), `radix-ui` (Popover), `react-day-picker@^9` (+ transitive `date-fns`), Vitest + Testing Library, Tailwind, Bun.

## Global Constraints

- All user-facing copy in **Vietnamese**.
- **Bun only** — a repo hook blocks npm/npx/pnpm/yarn. Install deps with `bun add`, run scripts with `bun run`.
- `noUncheckedIndexedAccess: true` — `bun run typecheck` must be clean before every commit.
- FSD import boundaries (`bun run lint:fsd`): `shared/ui` may import `shared/lib` and external packages, never `entities`/`widgets`/`pages`. Every `shared/ui` primitive is exported from `src/shared/ui/index.ts`.
- Follow the existing radix-wrap pattern: primitives wrap `radix-ui` sub-namespaces and style the radix element directly (see `src/shared/ui/Dialog.tsx`, `Select.tsx`). **Do not** `asChild`-wrap the local `Button` (it does not forwardRef); style the radix Trigger directly with `buttonVariants(...)`, exactly as `Select.tsx` does.
- App date shape stays `DateRange = { from: string; to: string }` (ISO `YYYY-MM-DD`); conversion to/from `Date` happens only inside `DateRangePicker`.
- Brand color is `#2563eb` (`bg-brand` / `text-brand`); `Button variant="primary"` = `bg-brand text-white`.
- Commit subjects lowercase after the colon (commitlint).

## File Structure

Create:
- `src/shared/ui/Popover.tsx` — radix Popover wrapper (`Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent`).
- `src/shared/ui/Popover.test.tsx`
- `src/shared/ui/Calendar.tsx` — `react-day-picker` wrapper styled with project tokens.
- `src/shared/ui/Calendar.test.tsx`
- `src/shared/ui/DateRangePicker.tsx` — Popover + Calendar + styled trigger + ISO↔Date.
- `src/shared/ui/DateRangePicker.test.tsx`

Modify:
- `src/shared/lib/date-range.ts` — add `isoToDate`, `dateToISO`, `matchPreset`, `rdpRangeToIso`.
- `src/shared/lib/date-range.test.ts` — tests for the four new helpers.
- `src/shared/ui/index.ts` — export `Popover*`, `Calendar`, `DateRangePicker`.
- `src/widgets/date-range-control/DateRangeControl.tsx` — use `DateRangePicker`; active-preset highlight.
- `src/widgets/date-range-control/DateRangeControl.test.tsx` — update for the new UI + active state.
- `package.json` / `bun.lock` — add `react-day-picker`.

---

### Task 1: Date helpers — ISO↔Date, matchPreset, rdpRangeToIso

**Files:**
- Modify: `src/shared/lib/date-range.ts`
- Test: `src/shared/lib/date-range.test.ts`

**Interfaces:**
- Consumes: existing `toISODate` (private), `presetRange`, `RangePreset`, `DateRange` in this module.
- Produces (all exported from `@/shared/lib/date-range`):
  - `isoToDate(iso: string): Date` — local-time `Date` at midnight for an ISO `YYYY-MM-DD`.
  - `dateToISO(d: Date): string` — local-time ISO `YYYY-MM-DD`.
  - `matchPreset(value: DateRange): RangePreset | null` — the preset whose range equals `value`, else `null`.
  - `rdpRangeToIso(range: { from?: Date; to?: Date } | undefined): DateRange | null` — ISO range when both ends present, else `null`.

- [ ] **Step 1: Write the failing tests**

Append to `src/shared/lib/date-range.test.ts` (keep existing imports; extend the import from `./date-range` to include the new names):

```ts
import { dateToISO, isoToDate, matchPreset, rdpRangeToIso, presetRange } from './date-range'

describe('date <-> ISO conversion', () => {
  it('round-trips ISO through Date in local time', () => {
    expect(dateToISO(isoToDate('2026-07-04'))).toBe('2026-07-04')
    expect(dateToISO(isoToDate('2026-01-31'))).toBe('2026-01-31')
  })

  it('isoToDate builds a local midnight date', () => {
    const d = isoToDate('2026-07-04')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6) // July = 6
    expect(d.getDate()).toBe(4)
  })
})

describe('matchPreset', () => {
  it('recognises each preset range', () => {
    expect(matchPreset(presetRange('today'))).toBe('today')
    expect(matchPreset(presetRange('7d'))).toBe('7d')
    expect(matchPreset(presetRange('30d'))).toBe('30d')
  })

  it('returns null for a custom range', () => {
    expect(matchPreset({ from: '2026-01-01', to: '2026-01-15' })).toBeNull()
  })
})

describe('rdpRangeToIso', () => {
  it('converts a complete Date range to ISO', () => {
    expect(rdpRangeToIso({ from: isoToDate('2026-07-15'), to: isoToDate('2026-07-20') })).toEqual({
      from: '2026-07-15',
      to: '2026-07-20',
    })
  })

  it('returns null when the range is incomplete or undefined', () => {
    expect(rdpRangeToIso(undefined)).toBeNull()
    expect(rdpRangeToIso({ from: isoToDate('2026-07-15') })).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test:unit src/shared/lib/date-range.test.ts`
Expected: FAIL — `isoToDate`/`dateToISO`/`matchPreset`/`rdpRangeToIso` are not exported.

- [ ] **Step 3: Implement the helpers**

In `src/shared/lib/date-range.ts`, add after `toISODate` / near the other exports:

```ts
/** ISO YYYY-MM-DD -> local-midnight Date. */
export function isoToDate(iso: string): Date {
  const parts = iso.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

/** Local Date -> ISO YYYY-MM-DD. */
export function dateToISO(d: Date): string {
  return toISODate(d)
}
```

And add after `presetRange`:

```ts
/** Which preset (if any) the given range exactly equals; null for a custom range. */
export function matchPreset(value: DateRange): RangePreset | null {
  const presets: RangePreset[] = ['today', '7d', '30d']
  for (const p of presets) {
    const r = presetRange(p)
    if (r.from === value.from && r.to === value.to) return p
  }
  return null
}

/** react-day-picker Date range -> ISO DateRange; null unless both ends are set. */
export function rdpRangeToIso(range: { from?: Date; to?: Date } | undefined): DateRange | null {
  if (range?.from && range?.to) return { from: dateToISO(range.from), to: dateToISO(range.to) }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test:unit src/shared/lib/date-range.test.ts`
Expected: PASS (all suites, including the pre-existing ones).

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/date-range.ts src/shared/lib/date-range.test.ts
git commit -m "feat(ui): date iso<->date converters, matchPreset, rdpRangeToIso"
```

---

### Task 2: Popover primitive (radix wrapper)

**Files:**
- Create: `src/shared/ui/Popover.tsx`
- Create: `src/shared/ui/Popover.test.tsx`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `radix-ui` `Popover`; `cn` from `@/shared/lib/cn`.
- Produces (from `@/shared/ui`): `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent` (props = the matching radix component props; `PopoverContent` adds default `align="start"`, `sideOffset={6}`).

- [ ] **Step 1: Write the failing test**

Create `src/shared/ui/Popover.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'

describe('Popover', () => {
  it('renders content when open', () => {
    render(
      <Popover open>
        <PopoverTrigger>Mở</PopoverTrigger>
        <PopoverContent>Nội dung lịch</PopoverContent>
      </Popover>,
    )
    expect(screen.getByText('Nội dung lịch')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(
      <Popover open={false}>
        <PopoverTrigger>Mở</PopoverTrigger>
        <PopoverContent>Nội dung lịch</PopoverContent>
      </Popover>,
    )
    expect(screen.queryByText('Nội dung lịch')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit src/shared/ui/Popover.test.tsx`
Expected: FAIL — cannot find module `./Popover`.

- [ ] **Step 3: Implement the primitive**

Create `src/shared/ui/Popover.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/shared/lib/cn'

function Popover({ ...props }: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverAnchor({ ...props }: ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-auto rounded-card border border-line bg-white p-3 text-ink shadow-card',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
```

- [ ] **Step 4: Export from the UI kit**

In `src/shared/ui/index.ts`, add:

```ts
export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent } from './Popover'
```

- [ ] **Step 5: Run test + typecheck**

Run: `bun run test:unit src/shared/ui/Popover.test.tsx`
Expected: PASS (2 tests).
Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui/Popover.tsx src/shared/ui/Popover.test.tsx src/shared/ui/index.ts
git commit -m "feat(ui): popover primitive wrapping radix"
```

---

### Task 3: Calendar primitive (react-day-picker) + add dependency

**Files:**
- Create: `src/shared/ui/Calendar.tsx`
- Create: `src/shared/ui/Calendar.test.tsx`
- Modify: `src/shared/ui/index.ts`, `package.json`, `bun.lock`

**Interfaces:**
- Consumes: `react-day-picker` (`DayPicker`, its `locale` export), `@phosphor-icons/react` (`CaretLeftIcon`, `CaretRightIcon`), `buttonVariants` from `@/shared/ui/Button`, `cn`.
- Produces (from `@/shared/ui`): `Calendar` — `props = ComponentProps<typeof DayPicker>` (so `mode`, `selected`, `onSelect`, `numberOfMonths`, `defaultMonth` all pass through), with Vietnamese locale, Phosphor nav chevrons, and brand-token styling by default.

- [ ] **Step 1: Add the dependency**

Run: `bun add react-day-picker`
Expected: installs `react-day-picker@^9` and its transitive `date-fns`; updates `package.json` + `bun.lock`. If it resolves a version below 9, run `bun add react-day-picker@^9` explicitly. Confirm the installed major is 9 (`grep '"react-day-picker"' package.json`).

- [ ] **Step 2: Write the failing test**

Create `src/shared/ui/Calendar.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Calendar } from './Calendar'

describe('Calendar', () => {
  it('renders a month grid for the given default month', () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 6, 1)} />)
    // react-day-picker renders the day cells as a grid.
    expect(screen.getByRole('grid')).toBeInTheDocument()
    // The 15th of the month is present as a day cell.
    expect(screen.getByText('15')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test:unit src/shared/ui/Calendar.test.tsx`
Expected: FAIL — cannot find module `./Calendar`.

- [ ] **Step 4: Implement the Calendar**

Create `src/shared/ui/Calendar.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { DayPicker } from 'react-day-picker'
import { vi } from 'react-day-picker/locale'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

/** shadcn-style calendar over react-day-picker, styled with project tokens (Vietnamese). */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={vi}
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-3',
        month_caption: 'relative flex h-8 items-center justify-center',
        caption_label: 'text-sm font-bold capitalize text-ink',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'size-8 p-0'),
        button_next: cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'size-8 p-0'),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-xs font-normal text-muted',
        week: 'mt-1 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button: 'size-9 rounded-control font-normal text-ink hover:bg-page',
        range_start: 'rounded-l-control bg-brand text-white',
        range_end: 'rounded-r-control bg-brand text-white',
        range_middle: 'rounded-none bg-brand-bg text-brand',
        selected: 'bg-brand text-white',
        today: 'font-bold text-brand',
        outside: 'text-muted opacity-50',
        disabled: 'opacity-30',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <CaretLeftIcon size={16} weight="bold" {...rest} />
          ) : (
            <CaretRightIcon size={16} weight="bold" {...rest} />
          ),
      }}
      {...props}
    />
  )
}
```

Notes for the implementer:
- If `bun run typecheck` flags the `classNames` keys or the `Chevron` component signature, the installed `react-day-picker@9` minor may differ slightly. Consult the package's own types (`node_modules/react-day-picker/dist/index.d.ts`) and adjust key names / the `Chevron` prop shape while keeping the same brand-token styling intent. Do not downgrade the package.
- If the calendar renders but the grid layout looks broken (columns not aligned) when you eyeball it, add `@import 'react-day-picker/style.css';` at the top of `src/styles.css` (after the existing `tw-animate-css` import) as a structural base, then re-check. Only do this if layout is actually broken.

- [ ] **Step 5: Export from the UI kit**

In `src/shared/ui/index.ts`, add:

```ts
export { Calendar } from './Calendar'
```

- [ ] **Step 6: Run test + typecheck**

Run: `bun run test:unit src/shared/ui/Calendar.test.tsx`
Expected: PASS (1 test). If `getByText('15')` is ambiguous (an outside day from an adjacent month also shows 15), switch the assertion to `screen.getAllByText('15').length > 0`.
Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/shared/ui/Calendar.tsx src/shared/ui/Calendar.test.tsx src/shared/ui/index.ts package.json bun.lock
git commit -m "feat(ui): calendar primitive over react-day-picker"
```

---

### Task 4: DateRangePicker (Popover + Calendar + trigger)

**Files:**
- Create: `src/shared/ui/DateRangePicker.tsx`
- Create: `src/shared/ui/DateRangePicker.test.tsx`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `Popover`/`PopoverTrigger`/`PopoverContent` (Task 2), `Calendar` (Task 3), `buttonVariants` from `@/shared/ui/Button`, `cn`, `CalendarBlankIcon` from `@phosphor-icons/react`, `isoToDate`/`rdpRangeToIso` (Task 1), `DateRange` type, `react-day-picker` `DateRange as RdpDateRange`.
- Produces (from `@/shared/ui`): `DateRangePicker` — `props: { value: DateRange; onChange: (range: DateRange) => void; className?: string }`. Also exports the pure helper `formatRangeLabel(value: DateRange): string`.

- [ ] **Step 1: Write the failing test**

Create `src/shared/ui/DateRangePicker.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangePicker, formatRangeLabel } from './DateRangePicker'

describe('formatRangeLabel', () => {
  it('shows a single formatted date when from === to', () => {
    const label = formatRangeLabel({ from: '2026-07-04', to: '2026-07-04' })
    expect(label).not.toContain('–')
    expect(label).toContain('2026')
  })

  it('shows a from–to range when the dates differ', () => {
    const label = formatRangeLabel({ from: '2026-07-01', to: '2026-07-07' })
    expect(label).toContain('–')
  })
})

describe('DateRangePicker', () => {
  it('renders a trigger showing the current range label', () => {
    render(
      <DateRangePicker value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={vi.fn()} />,
    )
    expect(
      screen.getByRole('button', { name: (n) => n.includes('–') }),
    ).toBeInTheDocument()
  })

  it('opens the calendar grid when the trigger is clicked', () => {
    render(
      <DateRangePicker value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: (n) => n.includes('–') }))
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit src/shared/ui/DateRangePicker.test.tsx`
Expected: FAIL — cannot find module `./DateRangePicker`.

- [ ] **Step 3: Implement DateRangePicker**

Create `src/shared/ui/DateRangePicker.tsx`:

```tsx
import { useState } from 'react'
import type { DateRange as RdpDateRange } from 'react-day-picker'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import { buttonVariants } from '@/shared/ui/Button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/Popover'
import { Calendar } from '@/shared/ui/Calendar'
import { isoToDate, rdpRangeToIso } from '@/shared/lib/date-range'
import { cn } from '@/shared/lib/cn'
import type { DateRange } from '@/shared/api/types/reports'

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** Vietnamese label for a range: one date if from===to, else "from – to". */
export function formatRangeLabel(value: DateRange): string {
  const from = dateFmt.format(isoToDate(value.from))
  if (value.from === value.to) return from
  return `${from} – ${dateFmt.format(isoToDate(value.to))}`
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)

  function handleSelect(range: RdpDateRange | undefined) {
    const iso = rdpRangeToIso(range)
    if (iso) {
      onChange(iso)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'secondary', size: 'sm' }),
          'inline-flex items-center gap-1.5',
          className,
        )}
      >
        <CalendarBlankIcon size={16} weight="bold" />
        {formatRangeLabel(value)}
      </PopoverTrigger>
      <PopoverContent align="end">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={isoToDate(value.from)}
          selected={{ from: isoToDate(value.from), to: isoToDate(value.to) }}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
```

Note: styling the radix `PopoverTrigger` directly with `buttonVariants(...)` (instead of `asChild` + `Button`) matches `Select.tsx` and avoids the local `Button`'s lack of `forwardRef`.

- [ ] **Step 4: Export from the UI kit**

In `src/shared/ui/index.ts`, add:

```ts
export { DateRangePicker, formatRangeLabel } from './DateRangePicker'
```

- [ ] **Step 5: Run test + typecheck**

Run: `bun run test:unit src/shared/ui/DateRangePicker.test.tsx`
Expected: PASS (4 tests). If the `name: (n) => n.includes('–')` matcher doesn't match (accessible-name whitespace), fall back to `screen.getByRole('button')` (there is only one button in the trigger) — keep asserting the label content via `toHaveTextContent('–')`.
Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui/DateRangePicker.tsx src/shared/ui/DateRangePicker.test.tsx src/shared/ui/index.ts
git commit -m "feat(ui): date range picker composing popover and calendar"
```

---

### Task 5: Wire DateRangePicker into DateRangeControl + active presets

**Files:**
- Modify: `src/widgets/date-range-control/DateRangeControl.tsx`
- Modify: `src/widgets/date-range-control/DateRangeControl.test.tsx`

**Interfaces:**
- Consumes: `Button`, `DateRangePicker` from `@/shared/ui`; `presetRange`, `matchPreset`, `RangePreset` from `@/shared/lib/date-range`; `DateRange` type.
- Produces: unchanged public API — `DateRangeControl({ value, onChange })`.

- [ ] **Step 1: Update the test (write the new expectations first)**

Replace the entire body of `src/widgets/date-range-control/DateRangeControl.test.tsx` with:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeControl } from './DateRangeControl'
import { presetRange, todayISO } from '@/shared/lib/date-range'

describe('DateRangeControl', () => {
  it('emits a range ending today when a preset is clicked', () => {
    const onChange = vi.fn()
    render(
      <DateRangeControl value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    expect(onChange).toHaveBeenCalledWith({ from: todayISO(), to: todayISO() })
  })

  it('marks the active preset with aria-pressed when the value matches it', () => {
    render(<DateRangeControl value={presetRange('7d')} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '7 ngày' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hôm nay' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: '30 ngày' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('marks no preset active for a custom range', () => {
    render(
      <DateRangeControl value={{ from: '2026-01-01', to: '2026-01-15' }} onChange={vi.fn()} />,
    )
    for (const label of ['Hôm nay', '7 ngày', '30 ngày']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('renders a date range picker trigger showing the current range', () => {
    render(
      <DateRangeControl value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={vi.fn()} />,
    )
    // The picker trigger shows a "from – to" label (contains the en dash).
    expect(screen.getByText((t) => t.includes('–'))).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit src/widgets/date-range-control/DateRangeControl.test.tsx`
Expected: FAIL — no `aria-pressed` / no picker trigger yet (old inputs still rendered).

- [ ] **Step 3: Rewrite the widget**

Replace the entire contents of `src/widgets/date-range-control/DateRangeControl.tsx` with:

```tsx
import { Button, DateRangePicker } from '@/shared/ui'
import { presetRange, matchPreset, type RangePreset } from '@/shared/lib/date-range'
import type { DateRange } from '@/shared/api/types/reports'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'today', label: 'Hôm nay' },
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
]

export function DateRangeControl({ value, onChange }: Props) {
  const active = matchPreset(value)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            variant={active === p.id ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={active === p.id}
            onClick={() => onChange(presetRange(p.id))}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <DateRangePicker value={value} onChange={onChange} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit src/widgets/date-range-control/DateRangeControl.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + FSD lint**

Run: `bun run typecheck`
Expected: clean.
Run: `bun run lint:fsd`
Expected: clean (widget imports only from `@/shared/*`).

- [ ] **Step 6: Commit**

```bash
git add src/widgets/date-range-control/DateRangeControl.tsx src/widgets/date-range-control/DateRangeControl.test.tsx
git commit -m "feat(reports): use date range picker + brand active-state presets"
```

---

### Task 6: Full verification

- [ ] **Step 1: Run the full validation suite**

Run: `bun run validate`
Expected: `tsc --noEmit` clean + all Vitest suites pass (including the `ReportsScreenPage` integration test, which still mounts `DateRangeControl` unchanged in API).

- [ ] **Step 2: Lint (incl. FSD boundaries)**

Run: `bun run lint && bun run lint:fsd`
Expected: no new errors. (Pre-existing kitchen warnings from before this branch may remain — do not touch them.)

- [ ] **Step 3: Manual/visual smoke (recommended)**

With BE on :3000 (`bun run db:seed`) and FE on :3001 (`bun run dev`): log in as `admin@demo.test` / `admin-password`, open `/kitchen/reports`. Confirm:
- The "7 ngày" preset is highlighted in brand blue on load (default range).
- Clicking "Hôm nay" / "30 ngày" moves the brand highlight and refetches.
- The date-range trigger opens a two-month calendar; selecting a start then an end day closes the popover, updates the trigger label, clears the preset highlight (custom range), and refetches.

- [ ] **Step 4: Report bundle note**

Confirm `react-day-picker` (+ `date-fns`) is the only added dependency (`git diff <branch-base> -- package.json`). No other deps should have changed.

---

## Self-Review

**Spec coverage:**
- shadcn Popover primitive (radix, no new dep) → Task 2. ✅
- shadcn Calendar over react-day-picker (+ dep, vi locale, Phosphor chevrons, brand tokens) → Task 3. ✅
- DateRangePicker (mode=range, 2 months, ISO↔Date, formatted trigger) → Task 4. ✅
- Used in Reports `DateRangeControl` replacing native inputs → Task 5. ✅
- Preset active state in brand color (`variant="primary"` + `aria-pressed`, `matchPreset`) → Tasks 1 + 5. ✅
- `DateRange` ISO shape preserved; conversion only in the picker → Tasks 1, 4. ✅
- Testing: pure helpers unit-tested; components smoke/interaction-tested; `validate`/`lint:fsd` clean → Tasks 1–6. ✅
- Non-goals respected (no time picker, no min/max, no single-date export, no changes below the widget). ✅

**Placeholder scan:** No TBD/TODO. The two adaptive notes (Calendar classNames/Chevron may need adjusting to the installed v9 minor; optional `style.css` import if layout breaks) are concrete conditional instructions with exact fallbacks, not deferred work.

**Type consistency:** `DateRange` (ISO) vs `RdpDateRange` (`react-day-picker`'s Date range) are kept distinct and only bridged by `isoToDate`/`rdpRangeToIso` (Task 1), used consistently in Task 4. `matchPreset`/`presetRange`/`RangePreset` names consistent across Tasks 1 and 5. `formatRangeLabel` defined and exported in Task 4, used only there. `buttonVariants` import used identically in Tasks 3 and 4.
