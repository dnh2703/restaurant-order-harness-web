import { toNumber } from '@/shared/lib/format'
import type { Order, OrderItem, OrderItemStatus, OrderStatus } from './model'

interface RawOrder {
  id: string
  status: OrderStatus
  subtotal: unknown
  discountAmount: unknown
  total: unknown
  openedAt: string
  items?: RawItem[]
}
interface RawItem {
  id: string
  menuItemId: string
  nameSnapshot: string
  unitPrice: unknown
  quantity: number
  note: string | null
  status: OrderItemStatus
  createdAt: string
  options?: { optionName: string; priceDelta: unknown }[]
}

export function normalizeOrder(raw: unknown): Order {
  const o = raw as RawOrder
  return {
    id: o.id,
    status: o.status,
    subtotal: toNumber(o.subtotal),
    discountAmount: toNumber(o.discountAmount),
    total: toNumber(o.total),
    openedAt: o.openedAt,
    items: (o.items ?? []).map(normalizeItem),
  }
}

function normalizeItem(raw: RawItem): OrderItem {
  return {
    id: raw.id,
    menuItemId: raw.menuItemId,
    nameSnapshot: raw.nameSnapshot,
    unitPrice: toNumber(raw.unitPrice),
    quantity: raw.quantity,
    note: raw.note,
    status: raw.status,
    createdAt: raw.createdAt,
    options: (raw.options ?? []).map((opt) => ({
      optionName: opt.optionName,
      priceDelta: toNumber(opt.priceDelta),
    })),
  }
}
