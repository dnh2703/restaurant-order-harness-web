import { createServerFn } from '@tanstack/react-start'
import { API_BASE_URL } from '@/shared/config'
import { toNumber } from '@/shared/lib/format'

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
