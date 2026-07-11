import { formatVND } from '@/shared/lib/format'
import type { RevenueSummary as Summary } from '@/shared/api/types/reports'

interface Props {
  summary: Summary
}

export function RevenueSummary({ summary }: Props) {
  const avg = summary.totalOrders > 0 ? Math.round(summary.totalRevenue / summary.totalOrders) : 0
  const tiles = [
    { label: 'Tổng doanh thu', value: formatVND(summary.totalRevenue) },
    { label: 'Số đơn', value: String(summary.totalOrders) },
    { label: 'Trung bình/đơn', value: formatVND(avg) },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-card border border-line-strong bg-white p-4 shadow-card"
        >
          <div className="text-xs font-extrabold uppercase tracking-wide text-secondary">
            {t.label}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-ink">{t.value}</div>
        </div>
      ))}
    </div>
  )
}
