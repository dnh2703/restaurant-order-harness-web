// Order domain types (mirror GET /api/qr/{qrToken}/order response `data`).

export type OrderItemStatus = 'PENDING' | 'COOKING' | 'SERVED' | 'CANCELLED'
export type OrderStatus = 'OPEN' | 'PAID' | 'CANCELLED'

export interface OrderItemOption {
  optionName: string
  priceDelta: number
}

export interface OrderItem {
  id: string
  menuItemId: string
  nameSnapshot: string
  unitPrice: number
  quantity: number
  note: string | null
  status: OrderItemStatus
  createdAt: string
  options: OrderItemOption[]
}

export interface Order {
  id: string
  status: OrderStatus
  subtotal: number
  discountAmount: number
  total: number
  openedAt: string
  items: OrderItem[]
}
