import { createServerFn } from '@tanstack/react-start'
import { API_BASE_URL } from '@/shared/config'
import { toNumber } from '@/shared/lib/format'
import { normalizeOrder } from '@/entities/order/normalize'
import type { Order } from '@/entities/order/model'

interface SubmitInput {
  qrToken: string
  items: { menuItemId: string; quantity: number }[]
}

export const submitOrderItems = createServerFn({ method: 'POST' })
  .validator((d: SubmitInput) => d)
  .handler(async ({ data }) => {
    const res = await fetch(
      `${API_BASE_URL}/api/qr/${encodeURIComponent(data.qrToken)}/order-items`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: data.items }),
      },
    )
    if (!res.ok) {
      throw new Error(
        res.status === 404 ? 'Phiên bàn không hợp lệ' : `Gửi đơn thất bại (${res.status})`,
      )
    }
    const json = (await res.json()) as { data: { id: string; total: unknown } }
    return { id: json.data.id, total: toNumber(json.data.total) }
  })

/** Server-only: read the QR session's current order with item statuses. Exported for unit tests. */
export async function fetchOrder(qrToken: string): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/api/qr/${encodeURIComponent(qrToken)}/order`)
  if (!res.ok) {
    throw new Error(
      res.status === 404 ? 'Phiên bàn không hợp lệ' : `Không tải được đơn (${res.status})`,
    )
  }
  const json = (await res.json()) as { data: unknown }
  return normalizeOrder(json.data)
}

export const getOrder = createServerFn({ method: 'GET' })
  .validator((d: { qrToken: string }) => d)
  .handler(({ data }): Promise<Order> => fetchOrder(data.qrToken))
