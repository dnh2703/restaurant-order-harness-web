import { authedFetch, type TokenStore } from '@/shared/lib/staff-auth.server'
import { normalizeRevenueReport, normalizeTopDish } from '@/shared/api/reports-normalize'
import type { DateRange, RevenueReport, TopDish } from '@/shared/api/types/reports'

async function readData<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
  return ((await res.json()) as { data: T }).data
}

function query(range: DateRange): string {
  return `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
}

export async function fetchRevenue(store: TokenStore, range: DateRange): Promise<RevenueReport> {
  const data = await readData<{ days: unknown[]; summary: unknown }>(
    await authedFetch(store, `/api/reports/revenue?${query(range)}`),
  )
  return normalizeRevenueReport(data, range)
}

export async function fetchTopDishes(
  store: TokenStore,
  range: DateRange,
  limit = 10,
): Promise<TopDish[]> {
  const data = await readData<{ dishes: unknown[] }>(
    await authedFetch(store, `/api/reports/top-dishes?${query(range)}&limit=${limit}`),
  )
  return (data.dishes ?? []).map(normalizeTopDish)
}
