# shadcn Revenue Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled native SVG `RevenueChart` with a shadcn-style Recharts bar chart: add `recharts`, add shadcn's `chart.tsx` primitives + `--chart-*` theme tokens, and rewrite the widget.

**Architecture:** Add `recharts` and the canonical shadcn `src/shared/ui/chart.tsx` (ChartContainer wraps `ResponsiveContainer`, provides a config context, injects per-series colors via a `<style>` tag; ChartTooltipContent renders the shadcn tooltip). `RevenueChart` becomes a `<BarChart>` inside `ChartContainer` with a definite-height container. Data contract (`days: RevenueDay[]`) and empty state are unchanged; nothing below the widget changes.

**Tech Stack:** TanStack Start (React 19), Tailwind v4 (`@theme`), `recharts` (new), Vitest + Testing Library, Playwright (real-browser smoke), Bun.

## Global Constraints

- All user-facing copy in **Vietnamese** ("Doanh thu", "Không có dữ liệu.").
- **Bun only** — a hook blocks npm/npx/pnpm/yarn. `bun add`, `bun run`.
- `noUncheckedIndexedAccess: true` — `bun run typecheck` clean before every commit.
- FSD: `shared/ui` may import `shared/lib` + external; export new primitives from `src/shared/ui/index.ts` (additive). A widget imports only `@/shared/*`.
- Money via `formatVND` from `@/shared/lib/format`.
- Brand blue is `#2563eb`; the single revenue series uses `var(--color-chart-1)`.
- **Recharts + jsdom does not lay out** (`ResponsiveContainer` reports 0×0): unit tests must NOT assert Recharts SVG geometry. A real-browser (Playwright) smoke measuring visible bars is REQUIRED (Task 3) — this class of "test green, chart blank" bug is invisible to jsdom.
- `ChartContainer` must have a **definite height** (`h-64`), or `ResponsiveContainer` renders nothing.
- Commit subjects lowercase after the colon.

## File Structure

Create:
- `src/shared/ui/chart.tsx` — shadcn chart primitives (`ChartContainer`, `ChartStyle`, `ChartTooltip`, `ChartTooltipContent`, `useChart`, `type ChartConfig`).
- `src/shared/ui/chart.test.tsx` — smoke test.

Modify:
- `package.json` / `bun.lock` — add `recharts`.
- `src/styles.css` — add `--chart-1..5` tokens to `@theme`.
- `src/shared/ui/index.ts` — export chart primitives + `ChartConfig`.
- `src/widgets/revenue-chart/RevenueChart.tsx` — rewrite as a Recharts bar chart.
- `src/widgets/revenue-chart/RevenueChart.test.tsx` — replace tests (old `data-testid="bar"` / `h-full` assertions no longer apply).

---

### Task 1: recharts dependency + theme tokens + shadcn chart primitives

**Files:**
- Modify: `package.json`, `bun.lock`, `src/styles.css`, `src/shared/ui/index.ts`
- Create: `src/shared/ui/chart.tsx`, `src/shared/ui/chart.test.tsx`

**Interfaces:**
- Consumes: `recharts` (external), `cn` from `@/shared/lib/cn`.
- Produces (from `@/shared/ui`): `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartStyle`, `useChart`, and `type ChartConfig`.

- [ ] **Step 1: Add the dependency**

Run: `bun add recharts`
Expected: `recharts` added to `package.json` dependencies + `bun.lock` updated. Confirm it installed: `grep '"recharts"' package.json`. Recharts 2.x is expected (React 19 compatible via 2.13+). If install resolves a version <2.13, run `bun add recharts@^2.13`.

- [ ] **Step 2: Add chart color tokens to the theme**

In `src/styles.css`, inside the `@theme { … }` block, after the `--color-ok-text` line, add:

```css
  --color-chart-1: #2563eb;
  --color-chart-2: #60a5fa;
  --color-chart-3: #1e40af;
  --color-chart-4: #93c5fd;
  --color-chart-5: #1d4ed8;
```

- [ ] **Step 3: Write the failing smoke test**

Create `src/shared/ui/chart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { BarChart, Bar } from 'recharts'
import { ChartContainer, type ChartConfig } from './chart'

const config = { revenue: { label: 'Doanh thu', color: 'var(--color-chart-1)' } } satisfies ChartConfig

describe('ChartContainer', () => {
  it('renders a chart wrapper with the data-chart id and injects the series color var', () => {
    const { container } = render(
      <ChartContainer config={config}>
        <BarChart data={[{ day: 'x', revenue: 1 }]}>
          <Bar dataKey="revenue" />
        </BarChart>
      </ChartContainer>,
    )
    const chart = container.querySelector('[data-slot="chart"]')
    expect(chart).not.toBeNull()
    // ChartStyle injects a --color-revenue custom property rule for this chart.
    expect(container.querySelector('style')?.innerHTML).toContain('--color-revenue')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun run test:unit src/shared/ui/chart.test.tsx`
Expected: FAIL — cannot find module `./chart`.

- [ ] **Step 5: Implement the shadcn chart primitives**

Create `src/shared/ui/chart.tsx` (canonical shadcn chart component, trimmed to no legend):

```tsx
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/shared/lib/cn'

const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used within a <ChartContainer />')
  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-line [&_.recharts-curve.recharts-tooltip-cursor]:stroke-line [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, itemConfig]) => itemConfig.theme || itemConfig.color)

  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  hideLabel = false,
  className,
}: React.ComponentProps<'div'> & {
  active?: boolean
  payload?: Array<Record<string, unknown>>
  label?: unknown
  hideLabel?: boolean
  labelFormatter?: (label: unknown, payload: Array<Record<string, unknown>>) => React.ReactNode
  formatter?: (value: unknown, name: unknown, item: Record<string, unknown>) => React.ReactNode
}) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  const tooltipLabel = hideLabel
    ? null
    : labelFormatter
      ? labelFormatter(label, payload)
      : String(label ?? '')

  return (
    <div
      className={cn(
        'grid min-w-[8rem] items-start gap-1.5 rounded-card border border-line-strong bg-white px-2.5 py-1.5 text-xs shadow-card',
        className,
      )}
    >
      {tooltipLabel ? <div className="font-bold text-ink">{tooltipLabel}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? 'value')
          const itemConfig = config[key]
          const indicatorColor = `var(--color-${key})`
          return (
            <div key={index} className="flex items-center gap-2 text-muted">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: indicatorColor }}
              />
              <span className="text-secondary">{itemConfig?.label ?? key}</span>
              <span className="ml-auto font-mono font-bold text-ink">
                {formatter ? formatter(item.value, item.name, item) : String(item.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle, useChart }
```

Note for the implementer: the recharts `Tooltip` passes `active`/`payload`/`label` into the `content` element at runtime; the prop types above are permissive on purpose so it typechecks under strict mode. If `bun run typecheck` flags the recharts `ResponsiveContainer` children type or the Tooltip `content` prop, consult the INSTALLED recharts types in `node_modules/recharts` and adjust the annotations only (keep runtime behavior). Report any adjustment.

- [ ] **Step 6: Export from the UI kit**

In `src/shared/ui/index.ts`, add:

```ts
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
  useChart,
  type ChartConfig,
} from './chart'
```

- [ ] **Step 7: Run test + typecheck**

Run: `bun run test:unit src/shared/ui/chart.test.tsx`
Expected: PASS (1 test).
Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add package.json bun.lock src/styles.css src/shared/ui/chart.tsx src/shared/ui/chart.test.tsx src/shared/ui/index.ts
git commit -m "feat(ui): recharts + shadcn chart primitives and theme tokens"
```

---

### Task 2: Rewrite RevenueChart as a Recharts bar chart

**Files:**
- Modify: `src/widgets/revenue-chart/RevenueChart.tsx`
- Modify: `src/widgets/revenue-chart/RevenueChart.test.tsx`

**Interfaces:**
- Consumes: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `type ChartConfig` from `@/shared/ui`; `recharts` (`Bar`, `BarChart`, `CartesianGrid`, `XAxis`); `formatVND` from `@/shared/lib/format`; `RevenueDay` type.
- Produces: `RevenueChart({ days: RevenueDay[] })` (unchanged public API); exports pure `dayAxisLabel(iso: string): string`.

- [ ] **Step 1: Replace the test**

Replace the entire contents of `src/widgets/revenue-chart/RevenueChart.test.tsx` with:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RevenueChart, dayAxisLabel } from './RevenueChart'

const days = [
  { day: '2026-07-01', revenue: 0, orderCount: 0 },
  { day: '2026-07-02', revenue: 100000, orderCount: 1 },
  { day: '2026-07-03', revenue: 50000, orderCount: 1 },
]

describe('dayAxisLabel', () => {
  it('formats an ISO day as DD/MM', () => {
    expect(dayAxisLabel('2026-07-04')).toBe('04/07')
    expect(dayAxisLabel('2026-12-31')).toBe('31/12')
  })
})

describe('RevenueChart', () => {
  it('renders the chart container (not the empty state) when there are days', () => {
    const { container } = render(<RevenueChart days={days} />)
    expect(container.querySelector('[data-slot="chart"]')).not.toBeNull()
    expect(screen.queryByText('Không có dữ liệu.')).not.toBeInTheDocument()
  })

  it('renders an empty state when there are no days', () => {
    render(<RevenueChart days={[]} />)
    expect(screen.getByText('Không có dữ liệu.')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="chart"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit src/widgets/revenue-chart/RevenueChart.test.tsx`
Expected: FAIL — `dayAxisLabel` not exported / chart container not rendered (old markup).

- [ ] **Step 3: Rewrite the widget**

Replace the entire contents of `src/widgets/revenue-chart/RevenueChart.tsx` with:

```tsx
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/ui'
import { formatVND } from '@/shared/lib/format'
import type { RevenueDay } from '@/shared/api/types/reports'

const chartConfig = {
  revenue: { label: 'Doanh thu', color: 'var(--color-chart-1)' },
} satisfies ChartConfig

/** '2026-07-04' -> '04/07' (short x-axis label). */
export function dayAxisLabel(iso: string): string {
  const parts = iso.split('-')
  return `${parts[2]}/${parts[1]}`
}

interface Props {
  days: RevenueDay[]
}

export function RevenueChart({ days }: Props) {
  if (days.length === 0) {
    return <p className="text-sm text-muted">Không có dữ liệu.</p>
  }

  return (
    <div className="rounded-card border border-line-strong bg-white p-4 shadow-card">
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <BarChart accessibilityLayer data={days} margin={{ left: 4, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={dayAxisLabel}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => dayAxisLabel(String(label))}
                formatter={(value) => formatVND(Number(value))}
              />
            }
          />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
```

Note: `aspect-auto h-64 w-full` on `ChartContainer` overrides the primitive's default `aspect-video` (tailwind-merge keeps the later aspect utility) and gives `ResponsiveContainer` a **definite height** — without it the chart renders blank. `fill="var(--color-revenue)"` resolves via the `--color-revenue` var that `ChartStyle` injects from `chartConfig.revenue.color`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit src/widgets/revenue-chart/RevenueChart.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + FSD lint**

Run: `bun run typecheck`
Expected: clean.
Run: `bun run lint:fsd`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/revenue-chart/RevenueChart.tsx src/widgets/revenue-chart/RevenueChart.test.tsx
git commit -m "feat(reports): shadcn recharts bar chart for daily revenue"
```

---

### Task 3: Verification (incl. required real-browser smoke)

- [ ] **Step 1: Full validation suite**

Run: `bun run validate`
Expected: `tsc --noEmit` clean + all Vitest suites pass (the `ReportsScreenPage` integration test still mounts `RevenueChart` — it should not assert on the old `data-testid="bar"`; if it does, update that assertion to check `[data-slot="chart"]` presence).

- [ ] **Step 2: Lint (incl. FSD)**

Run: `bun run lint && bun run lint:fsd`
Expected: no new errors (pre-existing kitchen warnings may remain).

- [ ] **Step 3: REQUIRED real-browser visual smoke**

Recharts does not render in jsdom, so this is the only real guard that bars are visible. Verify in real Chromium (Playwright is installed). Preferred: drive the running app.

1. Start BE on :3000 with seed data (`bun run db:seed` in the backend) and FE on :3001 (`bun run dev`).
2. With Playwright/Chromium, log in as `admin@demo.test` / `admin-password`, go to `/kitchen/reports`, and:
   - assert an `svg.recharts-surface` exists inside `[data-slot="chart"]`,
   - assert at least one bar `path.recharts-rectangle` (or `.recharts-bar-rectangle path`) has a bounding-box **height > 0**,
   - screenshot `/kitchen/reports` for a visual check of the bar chart + tooltip styling.

If a running BE is unavailable, render `RevenueChart` with a fixed-size wrapper in a throwaway Playwright page (mount via a tiny Vite build or the existing e2e harness) and assert the same "bar height > 0". Do NOT mark this task complete on unit tests alone — a real browser must show non-zero bars.

- [ ] **Step 4: Confirm dependency delta**

Run: `git diff <branch-base> -- package.json`
Expected: only `recharts` added (plus its transitive deps in `bun.lock`, not in `package.json` dependencies).

---

## Self-Review

**Spec coverage:**
- recharts dep + shadcn chart.tsx primitives + `--chart-*` tokens → Task 1. ✅
- RevenueChart rewrite as Recharts BarChart in ChartContainer, definite height, rounded bars, grid, muted axis, tooltip w/ formatVND → Task 2. ✅
- Data contract `days` unchanged; empty state preserved → Task 2. ✅
- Testing acknowledges Recharts/jsdom limits (no SVG-geometry asserts); pure `dayAxisLabel` tested; REQUIRED real-browser smoke → Tasks 2, 3. ✅
- Definite-height container risk called out and handled (`aspect-auto h-64 w-full`) → Task 2. ✅
- Non-goals respected (single series, no legend, no other charts). ✅

**Placeholder scan:** No TBD/TODO. The tooltip-typing and ResponsiveContainer-children notes are concrete conditional instructions with a stated fallback (consult installed recharts types), not deferred work. Task 3 Step 3 is a concrete verification procedure, not a placeholder.

**Type consistency:** `ChartConfig` defined in Task 1, used in Task 2 via `satisfies ChartConfig`. `ChartContainer`/`ChartTooltip`/`ChartTooltipContent` names consistent across Tasks 1–2. `dayAxisLabel` defined + exported in Task 2, used in its own tooltip/axis and tested. `--color-chart-1` (Task 1 token) → `chartConfig.revenue.color = var(--color-chart-1)` → `ChartStyle` emits `--color-revenue` → `Bar fill="var(--color-revenue)"` (consistent chain).
