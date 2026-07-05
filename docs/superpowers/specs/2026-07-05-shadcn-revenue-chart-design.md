# shadcn-style Revenue Chart — Design

- **Date:** 2026-07-05
- **Branch:** continues on `feat/reports-e07` (PR #15 open). Replaces the hand-rolled native SVG `RevenueChart`.
- **Scope:** Frontend. Add `recharts`, create shadcn's `chart.tsx` primitives in `shared/ui`, add `--chart-*` theme tokens, and rewrite the Reports `RevenueChart` widget as a Recharts bar chart wrapped in `ChartContainer`.

## 1. Goal

Replace the current native SVG/div bar chart in "Doanh thu theo ngày" with a shadcn/ui chart: a Recharts `<BarChart>` inside shadcn's `ChartContainer`, with a hover tooltip (`ChartTooltipContent`) showing the day + revenue, a subtle grid, rounded bar tops, and muted axis labels. Keep the existing data contract (gap-filled `days`) and empty state.

## 2. Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Charting engine | **`recharts`** (new dependency) + shadcn `chart.tsx` wrappers | shadcn charts *are* Recharts + a thin wrapper set (`ChartContainer`/`ChartTooltip`/`ChartTooltipContent`/`ChartConfig`). Faithful to "giống shadcn ui". User explicitly asked for the shadcn chart. |
| Chart type | **Bar chart** | Matches the current discrete "revenue per day" semantics and shadcn's canonical Bar Chart. |
| Reusability | shadcn primitives in **`src/shared/ui/chart.tsx`** (canonical shadcn file), exported from `index.ts` | Reusable for future report charts; standard shadcn structure. |
| Colors | add `--chart-1` (brand blue `#2563eb`) to the Tailwind v4 `@theme`; single series uses `var(--color-chart-1)` via `ChartConfig` | Single-series revenue; consistent with brand. shadcn keys series colors through `ChartConfig` → CSS vars. |
| Container height | `ChartContainer` gets an explicit height (`h-64 w-full`) | Recharts `ResponsiveContainer` needs a sized parent or it renders nothing (this is the same class of bug just fixed on the native chart — a chart parent must have a definite size). |
| Data shape | keep `days: RevenueDay[]` (gap-filled) prop; map to Recharts `data` | No change below the widget; server fn / normalizer untouched. |

**New dependency:** `recharts` (pulls d3-* sub-deps). Heavier than the native approach, but it's what shadcn charts require. This deliberately supersedes E07's "native SVG, no chart library" decision, at the user's request.

## 3. Architecture (FSD)

```
src/shared/ui/chart.tsx    # shadcn chart primitives: ChartContainer, ChartTooltip,
                           #   ChartTooltipContent, ChartStyle, useChart, type ChartConfig
src/shared/ui/index.ts     # export the chart primitives + ChartConfig type
src/styles.css             # add --chart-1 (and --chart-2..5 placeholders) to @theme
src/widgets/revenue-chart/RevenueChart.tsx   # rewrite: Recharts BarChart in ChartContainer
```

`chart.tsx` is the standard shadcn component (ChartContainer wraps `ResponsiveContainer`, provides a React context carrying `ChartConfig`, injects per-series colors via a `<ChartStyle>` `<style>` tag, and `ChartTooltipContent` renders the shadcn tooltip). It imports `recharts` primitives and `cn`.

### RevenueChart contract (unchanged public API)

- `props: { days: RevenueDay[] }` (gap-filled, ascending).
- Empty state (`days.length === 0`) → the existing "Không có dữ liệu." text.
- Otherwise renders:
  - `ChartContainer config={chartConfig} className="h-64 w-full"` wrapping a Recharts `<BarChart data={days}>`.
  - `<CartesianGrid vertical={false}>` (subtle horizontal grid).
  - `<XAxis dataKey="day">` with a tick formatter → short Vietnamese day label (e.g. `04/07`), `tickLine={false}`, `axisLine={false}`, muted.
  - `<YAxis>` hidden or minimal (shadcn revenue charts often hide it; keep it hidden for a clean look).
  - `<ChartTooltip content={<ChartTooltipContent ... />}>` — tooltip shows the full day + `formatVND(revenue)`.
  - `<Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4,4,0,0]} />` (rounded top). `--color-revenue` comes from `ChartConfig.revenue.color = 'var(--color-chart-1)'`.
- `chartConfig: ChartConfig = { revenue: { label: 'Doanh thu', color: 'var(--color-chart-1)' } }`.
- Accessibility: `ChartContainer` renders an accessible region; keep a meaningful label (e.g. pass `aria-label` summarizing range + total, or rely on the tooltip). Preserve at least the range/total summary for screen readers.

## 4. Data flow

`ReportsScreenPage` → `RevenueChart days={report.days}` (unchanged). Inside, `days` is fed directly to `<BarChart data>`; Recharts reads `dataKey="day"`/`"revenue"`. Tooltip/axis formatters use `formatVND` and a small day-label formatter. Nothing changes in server fns, normalizer, or the page.

## 5. Testing

Recharts + jsdom/happy-dom is a known limitation: `ResponsiveContainer` measures its parent, which reports 0×0 in jsdom, so the SVG bars often don't render in unit tests. Therefore:

**Unit (Vitest):**
- Empty state: `days=[]` → "Không có dữ liệu." renders.
- Non-empty: the chart container renders and the empty-state text is absent. Assert `ChartContainer`'s `data-slot` (or a stable wrapper) is present. (Do not assert on Recharts internal SVG geometry — unreliable in jsdom.)
- Pure formatters extracted and unit-tested: the day-axis label formatter (`'2026-07-04' → '04/07'`) and the tooltip value formatter (`formatVND`). Keep these pure and exported so they're testable without a rendered chart.

**Real-browser visual smoke (REQUIRED — this class of bug is invisible to jsdom):**
- After implementation, verify in real Chromium (Playwright) that the chart renders **visible bars with height > 0** — either by driving the running app at `/kitchen/reports` (admin login) or by measuring a rendered instance. The last two chart defects this session ("test green, chart blank") were only caught by a real-browser measurement, so this step is mandatory, not optional.

**Full suite / lint:** `bun run validate` + `bun run lint:fsd` must stay green. `bun install` via Bun only for `recharts`.

## 6. Non-goals

- Multiple series, legend, or stacked/grouped bars (single revenue series).
- Switching top-dishes or summary tiles to charts.
- Animated transitions beyond Recharts defaults.
- A generic chart theme system beyond `--chart-1` (add `--chart-2..5` as unused placeholders only, for future).

## 7. Risks / notes

- **Bundle size:** recharts + d3 modules are sizable. Accepted for the shadcn look, per the explicit request.
- **Container sizing:** `ResponsiveContainer` needs a definite parent size — `ChartContainer` must have an explicit height (`h-64`), mirroring the definite-height fix just applied to the native chart. This is the top runtime risk and is covered by the required visual smoke.
- **jsdom rendering:** unit tests intentionally avoid asserting Recharts SVG geometry; the visual smoke is the real guard.
- The native-chart height fix (commit ea55250) is superseded by this rewrite; that's expected.
