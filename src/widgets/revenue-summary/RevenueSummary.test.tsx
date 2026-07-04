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

  it('avoids divide-by-zero when there are no orders', () => {
    render(
      <RevenueSummary
        summary={{ from: '2026-07-01', to: '2026-07-07', totalRevenue: 0, totalOrders: 0 }}
      />,
    )
    // Average tile shows 0đ, not NaN.
    expect(screen.getAllByText('0đ').length).toBeGreaterThanOrEqual(1)
  })
})
