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
