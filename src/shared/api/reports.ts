import { createServerFn } from '@tanstack/react-start'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'
import { fetchRevenue, fetchTopDishes } from '@/shared/api/reports.server'
import type { DateRange, RevenueReport, TopDish } from '@/shared/api/types/reports'

export const getRevenueReport = createServerFn({ method: 'GET' })
  .validator((d: DateRange) => d)
  .handler(({ data }): Promise<RevenueReport> => fetchRevenue(cookieTokenStore, data))

export const getTopDishes = createServerFn({ method: 'GET' })
  .validator((d: DateRange & { limit?: number }) => d)
  .handler(({ data }): Promise<TopDish[]> =>
    fetchTopDishes(cookieTokenStore, { from: data.from, to: data.to }, data.limit ?? 10),
  )
