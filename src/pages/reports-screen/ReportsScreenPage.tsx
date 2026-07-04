import { useCallback, useEffect, useState } from 'react'
import { SideNav } from '@/widgets/side-nav'
import { DateRangeControl } from '@/widgets/date-range-control'
import { RevenueSummary } from '@/widgets/revenue-summary'
import { RevenueChart } from '@/widgets/revenue-chart'
import { TopDishesTable } from '@/widgets/top-dishes-table'
import type { StaffUser } from '@/entities/staff'
import { getRevenueReport, getTopDishes } from '@/shared/api/reports'
import { presetRange } from '@/shared/lib/date-range'
import type { DateRange, RevenueReport, TopDish } from '@/shared/api/types/reports'

interface Props {
  user: StaffUser
  onLogout: () => void | Promise<void>
}

export function ReportsScreenPage({ user, onLogout }: Props) {
  const [range, setRange] = useState<DateRange>(() => presetRange('7d'))
  const [report, setReport] = useState<RevenueReport | null>(null)
  const [dishes, setDishes] = useState<TopDish[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (r: DateRange) => {
    setLoading(true)
    setError(null)
    try {
      const [rev, top] = await Promise.all([
        getRevenueReport({ data: r }),
        getTopDishes({ data: { ...r, limit: 10 } }),
      ])
      setReport(rev)
      setDishes(top)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được báo cáo')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(range)
  }, [range, load])

  return (
    <div className="flex h-screen bg-page">
      <SideNav
        userName={user.name}
        userRole={user.role}
        onLogout={onLogout}
        activeSection="reports"
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-strong px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Báo cáo</h1>
            <p className="text-sm text-muted">Doanh thu và món bán chạy theo khoảng thời gian.</p>
          </div>
          <DateRangeControl value={range} onChange={setRange} />
        </header>

        {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-6 p-4 sm:p-6">
          {report && <RevenueSummary summary={report.summary} />}
          <section>
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-secondary">
              Doanh thu theo ngày
            </h2>
            {report && <RevenueChart days={report.days} />}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-secondary">
              Món bán chạy
            </h2>
            <TopDishesTable dishes={dishes} />
          </section>
          {loading && <p className="text-sm text-muted">Đang tải…</p>}
        </div>
      </main>
    </div>
  )
}
