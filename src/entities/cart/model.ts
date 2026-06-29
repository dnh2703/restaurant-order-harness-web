import type { MenuItem } from '@/entities/menu/model'

export interface CartLine {
  id: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

export function addItem(cart: CartLine[], item: MenuItem): CartLine[] {
  if (cart.some((l) => l.id === item.id)) {
    return cart.map((l) => (l.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
  }
  return [
    ...cart,
    { id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, quantity: 1 },
  ]
}

export function setQuantity(cart: CartLine[], id: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => l.id !== id)
  return cart.map((l) => (l.id === id ? { ...l, quantity: qty } : l))
}

export function cartCount(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.quantity, 0)
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((n, l) => n + l.price * l.quantity, 0)
}
