import type { OrderItemStatus } from './model'

interface StatusMeta {
  label: string
  tone: 'pending' | 'cooking' | 'served' | 'cancelled'
}

export const ORDER_ITEM_STATUS_META: Record<OrderItemStatus, StatusMeta> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'pending' },
  COOKING: { label: 'Đang nấu', tone: 'cooking' },
  SERVED: { label: 'Đã phục vụ', tone: 'served' },
  CANCELLED: { label: 'Đã hủy', tone: 'cancelled' },
}

/** The active lifecycle steps shown in the progress indicator (CANCELLED is terminal/aside). */
export const ORDER_ITEM_PROGRESS: OrderItemStatus[] = ['PENDING', 'COOKING', 'SERVED']
