import { authedFetch, type TokenStore } from '@/shared/lib/staff-auth.server'
import { normalizeBillDetail, normalizeCashierTable } from '@/shared/api/cashier-normalize'
import type {
  BillDetail,
  CashierTable,
  DiscountType,
  PaymentMethod,
} from '@/shared/api/types/cashier'

async function readData<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Không tải được dữ liệu (${res.status})`)
  return ((await res.json()) as { data: T }).data
}

const jsonHeaders = { 'content-type': 'application/json' }

export async function fetchOpenTables(store: TokenStore): Promise<CashierTable[]> {
  const data = await readData<{ tables: unknown[] }>(
    await authedFetch(store, '/api/cashier/tables'),
  )
  return data.tables.map(normalizeCashierTable)
}

export async function fetchBillDetail(store: TokenStore, id: string): Promise<BillDetail> {
  const data = await readData<unknown>(
    await authedFetch(store, `/api/cashier/orders/${encodeURIComponent(id)}`),
  )
  return normalizeBillDetail(data)
}

export async function applyDiscount(
  store: TokenStore,
  input: { id: string; type: DiscountType; value: number; reason: string },
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/cashier/orders/${encodeURIComponent(input.id)}/discount`,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ type: input.type, value: input.value, reason: input.reason }),
    },
  )
  if (!res.ok) throw new Error(`Không áp dụng được giảm giá (${res.status})`)
}

export async function takePayment(
  store: TokenStore,
  input: { id: string; method: PaymentMethod },
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/cashier/orders/${encodeURIComponent(input.id)}/payment`,
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ method: input.method }) },
  )
  if (!res.ok) throw new Error(`Không thanh toán được (${res.status})`)
}
