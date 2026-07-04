import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReportsScreenPage } from './ReportsScreenPage'
import { getRevenueReport, getTopDishes } from '@/shared/api/reports'

vi.mock('@/shared/api/reports', () => ({
  getRevenueReport: vi.fn(),
  getTopDishes: vi.fn(),
}))

const user = {
  id: 'u1',
  email: 'admin@demo.test',
  name: 'Quản Lý',
  role: 'ADMIN' as const,
  restaurantId: 'r1',
}

const revenue = {
  days: [{ day: '2026-07-04', revenue: 566000, orderCount: 1 }],
  summary: { from: '2026-07-04', to: '2026-07-04', totalRevenue: 566000, totalOrders: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getRevenueReport).mockResolvedValue(revenue)
  vi.mocked(getTopDishes).mockResolvedValue([
    { menuItemId: 'm1', name: 'Phở bò', quantitySold: 8, revenue: 417000 },
  ])
})

describe('ReportsScreenPage', () => {
  it('loads and renders summary, chart, and top dishes on mount', async () => {
    render(<ReportsScreenPage user={user} onLogout={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByText('566.000đ').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getAllByTestId('bar').length).toBeGreaterThanOrEqual(1)
  })

  it('refetches when the date range changes via a preset', async () => {
    render(<ReportsScreenPage user={user} onLogout={vi.fn()} />)
    await waitFor(() => expect(getRevenueReport).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    await waitFor(() => expect(getRevenueReport).toHaveBeenCalledTimes(2))
  })
})
