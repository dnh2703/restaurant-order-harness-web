export type DiscountType = 'PERCENT' | 'FIXED'
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD'
export type OrderItemStatus = 'PENDING' | 'COOKING' | 'SERVED' | 'CANCELLED'

/** One open table as shown in the cashier list. */
export interface CashierTable {
  orderId: string
  tableId: string
  tableName: string
  subtotal: number
  discountAmount: number
  total: number
  openedAt: string
  itemCount: number
}

export interface BillOption {
  optionName: string
  priceDelta: number
}

export interface BillItem {
  id: string
  nameSnapshot: string
  unitPrice: number
  quantity: number
  note: string | null
  status: OrderItemStatus
  options: BillOption[]
}

/** Full bill for one order. */
export interface BillDetail {
  orderId: string
  status: 'OPEN' | 'PAID' | 'CANCELLED'
  subtotal: number
  discountAmount: number
  discountReason: string | null
  total: number
  openedAt: string
  items: BillItem[]
}
