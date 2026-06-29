// src/widgets/order-tracker/OrderStatusChip.tsx
import { cn } from '@/shared/lib/cn'
import type { OrderItemStatus } from '@/entities/order/model'
import { ORDER_ITEM_STATUS_META } from '@/entities/order/status'

const TONE_CLASS: Record<string, string> = {
  pending: 'bg-page text-muted',
  cooking: 'bg-amber-100 text-amber-700',
  served: 'bg-ok-bg text-ok-text',
  cancelled: 'bg-red-50 text-red-600',
}

export function OrderStatusChip({ status }: { status: OrderItemStatus }) {
  const meta = ORDER_ITEM_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold',
        TONE_CLASS[meta.tone],
      )}
    >
      {meta.label}
    </span>
  )
}
