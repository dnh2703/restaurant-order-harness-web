import { describe, it, expect } from 'vitest'
import { addItem, setQuantity, cartCount, cartSubtotal } from './model'
import type { MenuItem } from '@/entities/menu/model'

const dish = (id: string, price: number): MenuItem => ({
  id,
  name: `Dish ${id}`,
  description: null,
  price,
  imageUrl: null,
  isAvailable: true,
  optionGroups: [],
})

describe('cart model', () => {
  it('adds a new line at quantity 1', () => {
    const c = addItem([], dish('a', 50000))
    expect(c).toHaveLength(1)
    expect(c[0]!).toMatchObject({ id: 'a', quantity: 1, price: 50000 })
  })
  it('increments an existing line', () => {
    const c = addItem(addItem([], dish('a', 50000)), dish('a', 50000))
    expect(c).toHaveLength(1)
    expect(c[0]!.quantity).toBe(2)
  })
  it('setQuantity updates and removes at <= 0', () => {
    let c = addItem([], dish('a', 50000))
    c = setQuantity(c, 'a', 3)
    expect(c[0]!.quantity).toBe(3)
    c = setQuantity(c, 'a', 0)
    expect(c).toHaveLength(0)
  })
  it('computes count and subtotal', () => {
    let c = addItem([], dish('a', 50000))
    c = addItem(c, dish('b', 30000))
    c = setQuantity(c, 'a', 2)
    expect(cartCount(c)).toBe(3)
    expect(cartSubtotal(c)).toBe(130000)
  })
})
