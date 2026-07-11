import { toNumber } from '@/shared/lib/format'
import { eachDayInclusive } from '@/shared/lib/date-range'
import type { DateRange, RevenueDay, RevenueReport, TopDish } from '@/shared/api/types/reports'

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function normalizeDay(raw: unknown): RevenueDay {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    day: str(r.day),
    revenue: toNumber(r.revenue),
    orderCount: toNumber(r.orderCount),
  }
}

export function normalizeRevenueReport(raw: unknown, range: DateRange): RevenueReport {
  const r = (raw ?? {}) as Record<string, unknown>
  const rawDays = Array.isArray(r.days) ? r.days : []
  const byDay = new Map<string, RevenueDay>()
  for (const d of rawDays) {
    const day = normalizeDay(d)
    if (day.day) byDay.set(day.day, day)
  }
  const days = eachDayInclusive(range.from, range.to).map(
    (day) => byDay.get(day) ?? { day, revenue: 0, orderCount: 0 },
  )
  const s = (r.summary ?? {}) as Record<string, unknown>
  return {
    days,
    summary: {
      from: str(s.from) || range.from,
      to: str(s.to) || range.to,
      totalRevenue: toNumber(s.totalRevenue),
      totalOrders: toNumber(s.totalOrders),
    },
  }
}

export function normalizeTopDish(raw: unknown): TopDish {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    menuItemId: str(r.menuItemId),
    name: str(r.name),
    quantitySold: toNumber(r.quantitySold),
    revenue: toNumber(r.revenue),
  }
}
