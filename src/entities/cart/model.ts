import type { MenuItem } from '@/entities/menu/model'

export interface CartOption {
  id: string
  name: string
  priceDelta: number
}

export interface CartLine {
  lineId: string
  menuItemId: string
  name: string
  imageUrl: string | null
  unitPrice: number
  options: CartOption[]
  note: string | null
  quantity: number
}

/** Stable key identifying a line by dish + chosen options (order-independent) + note. */
export function lineSignature(
  menuItemId: string,
  optionIds: string[],
  note: string | null,
): string {
  return `${menuItemId}|${[...optionIds].sort().join(',')}|${note ?? ''}`
}

export function buildCartLine(
  item: MenuItem,
  options: CartOption[],
  note: string | null,
  quantity: number,
): CartLine {
  const unitPrice = options.reduce((sum, o) => sum + o.priceDelta, item.price)
  return {
    lineId: lineSignature(
      item.id,
      options.map((o) => o.id),
      note,
    ),
    menuItemId: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    unitPrice,
    options,
    note,
    quantity,
  }
}

export function addLine(cart: CartLine[], line: CartLine): CartLine[] {
  if (cart.some((l) => l.lineId === line.lineId)) {
    return cart.map((l) =>
      l.lineId === line.lineId ? { ...l, quantity: l.quantity + line.quantity } : l,
    )
  }
  return [...cart, line]
}

export function setQuantity(cart: CartLine[], lineId: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => l.lineId !== lineId)
  return cart.map((l) => (l.lineId === lineId ? { ...l, quantity: qty } : l))
}

export function cartCount(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.quantity, 0)
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.unitPrice * l.quantity, 0)
}

/** Total quantity per menu item (a dish may span several lines) — for the card badge. */
export function quantityByMenuItem(cart: CartLine[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const l of cart) {
    out[l.menuItemId] = (out[l.menuItemId] ?? 0) + l.quantity
  }
  return out
}
