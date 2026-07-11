import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
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
    // The revenue chart is now a Recharts chart wrapped in shadcn ChartContainer.
    expect(document.querySelector('[data-slot="chart"]')).not.toBeNull()
  })

  it('renders the skeleton (not an empty state) on the initial SSR/first paint', () => {
    // Effects do not run during SSR, so the first painted frame reflects the initial
    // state. It must show the skeleton, never the "no data" empty state, to avoid a
    // flash of empty content on reload.
    const html = renderToString(<ReportsScreenPage user={user} onLogout={vi.fn()} />)
    expect(html).toContain('data-slot="skeleton"')
    expect(html).not.toContain('Chưa có dữ liệu bán hàng trong khoảng này.')
  })

  it('shows a skeleton while loading, then swaps to the real content', async () => {
    let resolveRev: (v: typeof revenue) => void = () => {}
    vi.mocked(getRevenueReport).mockReturnValue(
      new Promise<typeof revenue>((res) => {
        resolveRev = res
      }),
    )

    render(<ReportsScreenPage user={user} onLogout={vi.fn()} />)

    // While loading: skeleton placeholders are shown, the real chart is not.
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="chart"]')).toBeNull()
    expect(screen.queryByText('Đang tải…')).not.toBeInTheDocument()

    resolveRev(revenue)

    await waitFor(() => expect(document.querySelector('[data-slot="chart"]')).not.toBeNull())
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull()
  })

  it('refetches when the date range changes via a preset', async () => {
    render(<ReportsScreenPage user={user} onLogout={vi.fn()} />)
    await waitFor(() => expect(getRevenueReport).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    await waitFor(() => expect(getRevenueReport).toHaveBeenCalledTimes(2))
  })
})
