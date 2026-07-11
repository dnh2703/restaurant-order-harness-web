import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RevenueSummary } from './RevenueSummary'

describe('RevenueSummary', () => {
  it('shows total revenue, order count, and average per order', () => {
    render(
      <RevenueSummary
        summary={{ from: '2026-07-01', to: '2026-07-07', totalRevenue: 300000, totalOrders: 2 }}
      />,
    )
    expect(screen.getByText('300.000đ')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('150.000đ')).toBeInTheDocument()
  })

  it('avoids divide-by-zero when there are no orders (average shows 0đ, not NaN)', () => {
    render(
      <RevenueSummary
        summary={{ from: '2026-07-01', to: '2026-07-07', totalRevenue: 100000, totalOrders: 0 }}
      />,
    )
    // Total tile shows 100.000đ; the average tile must show 0đ (not NaNđ).
    expect(screen.getByText('100.000đ')).toBeInTheDocument()
    expect(screen.getByText('0đ')).toBeInTheDocument()
    expect(screen.queryByText('NaNđ')).not.toBeInTheDocument()
  })
})
