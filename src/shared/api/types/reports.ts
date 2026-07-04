export interface DateRange {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

export interface RevenueDay {
  day: string // YYYY-MM-DD
  revenue: number
  orderCount: number
}

export interface RevenueSummary {
  from: string
  to: string
  totalRevenue: number
  totalOrders: number
}

export interface RevenueReport {
  days: RevenueDay[] // gap-filled, ascending by day
  summary: RevenueSummary
}

export interface TopDish {
  menuItemId: string
  name: string
  quantitySold: number
  revenue: number
}
