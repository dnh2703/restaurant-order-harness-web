import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { BarChart, Bar } from 'recharts'
import { ChartContainer, type ChartConfig } from './chart'

const config = {
  revenue: { label: 'Doanh thu', color: 'var(--color-chart-1)' },
} satisfies ChartConfig

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
