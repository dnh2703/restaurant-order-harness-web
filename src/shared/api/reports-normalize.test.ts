import { describe, expect, it } from 'vitest'
import { normalizeRevenueReport, normalizeTopDish } from './reports-normalize'

describe('normalizeRevenueReport', () => {
  it('fills gap days with zeros across the requested range, ascending', () => {
    const raw = {
      days: [{ day: '2026-07-03', revenue: '150000', orderCount: 2 }],
      summary: { from: '2026-07-01', to: '2026-07-03', totalRevenue: '150000', totalOrders: 2 },
    }
    const report = normalizeRevenueReport(raw, { from: '2026-07-01', to: '2026-07-03' })

    expect(report.days).toEqual([
      { day: '2026-07-01', revenue: 0, orderCount: 0 },
      { day: '2026-07-02', revenue: 0, orderCount: 0 },
      { day: '2026-07-03', revenue: 150000, orderCount: 2 },
    ])
    expect(report.summary.totalRevenue).toBe(150000)
    expect(report.summary.totalOrders).toBe(2)
  })

  it('tolerates a missing/empty payload and falls back to the requested range', () => {
    const report = normalizeRevenueReport({}, { from: '2026-07-01', to: '2026-07-01' })
    expect(report.days).toEqual([{ day: '2026-07-01', revenue: 0, orderCount: 0 }])
    expect(report.summary).toEqual({
      from: '2026-07-01',
      to: '2026-07-01',
      totalRevenue: 0,
      totalOrders: 0,
    })
  })
})

describe('normalizeTopDish', () => {
  it('coerces string money/quantity fields to numbers', () => {
    expect(
      normalizeTopDish({ menuItemId: 'm1', name: 'Phở bò', quantitySold: '8', revenue: '417000' }),
    ).toEqual({ menuItemId: 'm1', name: 'Phở bò', quantitySold: 8, revenue: 417000 })
  })
})

describe('normalizer null-resilience', () => {
  it('skips a null entry in the days array without throwing', () => {
    const report = normalizeRevenueReport(
      { days: [null, { day: '2026-07-02', revenue: 100, orderCount: 1 }] },
      { from: '2026-07-01', to: '2026-07-02' },
    )
    expect(report.days).toEqual([
      { day: '2026-07-01', revenue: 0, orderCount: 0 },
      { day: '2026-07-02', revenue: 100, orderCount: 1 },
    ])
  })

  it('returns a zeroed dish for null input without throwing', () => {
    expect(normalizeTopDish(null)).toEqual({
      menuItemId: '',
      name: '',
      quantitySold: 0,
      revenue: 0,
    })
  })
})
