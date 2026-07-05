import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RevenueChart } from './RevenueChart'

const days = [
  { day: '2026-07-01', revenue: 0, orderCount: 0 },
  { day: '2026-07-02', revenue: 100000, orderCount: 1 },
  { day: '2026-07-03', revenue: 50000, orderCount: 1 },
]

describe('RevenueChart', () => {
  it('renders one bar per day with an accessible summary label', () => {
    render(<RevenueChart days={days} />)
    expect(screen.getAllByTestId('bar')).toHaveLength(3)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('2026-07-01')
    expect(img.getAttribute('aria-label')).toContain('150.000đ')
  })

  it('gives each bar wrapper a definite height so percentage-height bars do not collapse', () => {
    // Regression guard for the bars rendering at 0px: the bar height is a percentage,
    // so its wrapper must carry h-full (a definite height). jsdom does no layout, so we
    // assert the load-bearing class is present rather than measuring pixels.
    render(<RevenueChart days={days} />)
    for (const bar of screen.getAllByTestId('bar')) {
      expect(bar.parentElement?.className).toContain('h-full')
    }
  })

  it('renders an empty state when there are no days', () => {
    render(<RevenueChart days={[]} />)
    expect(screen.getByText('Không có dữ liệu.')).toBeInTheDocument()
  })
})
