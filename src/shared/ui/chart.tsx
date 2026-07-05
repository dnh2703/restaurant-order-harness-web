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
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme || itemConfig.color,
  )

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
