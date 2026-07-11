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
