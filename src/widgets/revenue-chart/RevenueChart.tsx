import { formatVND } from '@/shared/lib/format'
import type { RevenueDay } from '@/shared/api/types/reports'

interface Props {
  days: RevenueDay[]
}

export function RevenueChart({ days }: Props) {
  if (days.length === 0) {
    return <p className="text-sm text-muted">Không có dữ liệu.</p>
  }

  const firstDay = days[0]!
  const lastDay = days[days.length - 1]!
  const max = days.reduce((m, d) => Math.max(m, d.revenue), 0)
  const total = days.reduce((s, d) => s + d.revenue, 0)
  const label = `Doanh thu ${firstDay.day} đến ${lastDay.day}, tổng ${formatVND(total)}`

  return (
    <div className="rounded-card border border-line-strong bg-white p-4 shadow-card">
      <div role="img" aria-label={label} className="flex h-48 items-end gap-1">
        {days.map((d) => {
          const pct = max > 0 ? Math.round((d.revenue / max) * 100) : 0
          return (
            <div
              key={d.day}
              title={`${d.day}: ${formatVND(d.revenue)}`}
              // h-full is load-bearing: the bar's height is a percentage, which only
              // resolves against a parent with a definite height. Without h-full this
              // wrapper sizes to content (an indefinite height) and every bar collapses to 0.
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <div
                data-testid="bar"
                className="w-full rounded-t bg-brand"
                style={{ height: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{firstDay.day}</span>
        <span>{lastDay.day}</span>
      </div>
    </div>
  )
}
