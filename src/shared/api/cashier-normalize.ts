import type {
  BillDetail,
  BillItem,
  BillOption,
  CashierTable,
  OrderItemStatus,
} from '@/shared/api/types/cashier'

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

export function normalizeCashierTable(raw: unknown): CashierTable {
  const r = raw as Record<string, unknown>
  return {
    orderId: str(r.orderId),
    tableId: str(r.tableId),
    tableName: str(r.tableName),
    subtotal: num(r.subtotal),
    discountAmount: num(r.discountAmount),
    total: num(r.total),
    openedAt: str(r.openedAt),
    itemCount: num(r.itemCount),
  }
}

function normalizeOption(raw: unknown): BillOption {
  const r = raw as Record<string, unknown>
  return { optionName: str(r.optionName), priceDelta: num(r.priceDelta) }
}

function normalizeItem(raw: unknown): BillItem {
  const r = raw as Record<string, unknown>
  return {
    id: str(r.id),
    nameSnapshot: str(r.nameSnapshot),
    unitPrice: num(r.unitPrice),
    quantity: num(r.quantity),
    note: r.note == null ? null : String(r.note),
    status: (r.status as OrderItemStatus) ?? 'PENDING',
    options: Array.isArray(r.options) ? r.options.map(normalizeOption) : [],
  }
}

export function normalizeBillDetail(raw: unknown): BillDetail {
  const r = raw as Record<string, unknown>
  return {
    orderId: str(r.id ?? r.orderId),
    status: (r.status as BillDetail['status']) ?? 'OPEN',
    subtotal: num(r.subtotal),
    discountAmount: num(r.discountAmount),
    discountReason: r.discountReason == null ? null : String(r.discountReason),
    total: num(r.total),
    openedAt: str(r.openedAt),
    items: Array.isArray(r.items) ? r.items.map(normalizeItem) : [],
  }
}
