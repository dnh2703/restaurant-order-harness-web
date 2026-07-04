import { createServerFn } from '@tanstack/react-start'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'
import {
  applyDiscount,
  fetchBillDetail,
  fetchOpenTables,
  takePayment,
} from '@/shared/api/cashier.server'
import type {
  BillDetail,
  CashierTable,
  DiscountType,
  PaymentMethod,
} from '@/shared/api/types/cashier'

export const getOpenTables = createServerFn({ method: 'GET' }).handler(
  (): Promise<CashierTable[]> => fetchOpenTables(cookieTokenStore),
)

export const getBillDetail = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(({ data }): Promise<BillDetail> => fetchBillDetail(cookieTokenStore, data.id))

export const applyOrderDiscount = createServerFn({ method: 'POST' })
  .validator((d: { id: string; type: DiscountType; value: number; reason: string }) => d)
  .handler(({ data }): Promise<void> => applyDiscount(cookieTokenStore, data))

export const payOrder = createServerFn({ method: 'POST' })
  .validator((d: { id: string; method: PaymentMethod }) => d)
  .handler(({ data }): Promise<void> => takePayment(cookieTokenStore, data))
