import { describe, it, expect } from 'vitest'
import {
  buildCartLine,
  addLine,
  setQuantity,
  cartCount,
  cartSubtotal,
  lineSignature,
  quantityByMenuItem,
  type CartOption,
} from './model'
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

const opt = (id: string, priceDelta: number): CartOption => ({ id, name: id, priceDelta })

describe('cart model', () => {
  it('lineSignature is stable and order-independent for option ids', () => {
    expect(lineSignature('m1', ['b', 'a'], null)).toBe(lineSignature('m1', ['a', 'b'], null))
    expect(lineSignature('m1', ['a'], 'ít cay')).not.toBe(lineSignature('m1', ['a'], null))
  })

  it('buildCartLine sums option deltas into unitPrice', () => {
    const line = buildCartLine(dish('m1', 50000), [opt('l', 10000), opt('t', 5000)], null, 1)
    expect(line.unitPrice).toBe(65000)
    expect(line.menuItemId).toBe('m1')
    expect(line.quantity).toBe(1)
  })

  it('addLine merges identical lines and splits different option/note combos', () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [opt('s', 0)], null, 1))
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('s', 0)], null, 1))
    expect(c).toHaveLength(1)
    expect(c[0]!.quantity).toBe(2)
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('l', 10000)], null, 1))
    expect(c).toHaveLength(2)
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('s', 0)], 'ít hành', 1))
    expect(c).toHaveLength(3)
  })

  it('setQuantity updates by lineId and removes at <= 0', () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [], null, 1))
    const { lineId } = c[0]!
    c = setQuantity(c, lineId, 3)
    expect(c[0]!.quantity).toBe(3)
    c = setQuantity(c, lineId, 0)
    expect(c).toHaveLength(0)
  })

  it('computes count and subtotal across lines', () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [opt('l', 10000)], null, 1))
    c = addLine(c, buildCartLine(dish('m2', 30000), [], null, 1))
    c = setQuantity(c, c[0]!.lineId, 2)
    expect(cartCount(c)).toBe(3)
    expect(cartSubtotal(c)).toBe(150000) // 60000*2 + 30000
  })

  it("quantityByMenuItem aggregates quantity across a dish's lines", () => {
    let c = addLine([], buildCartLine(dish('m1', 50000), [opt('s', 0)], null, 1))
    c = addLine(c, buildCartLine(dish('m1', 50000), [opt('l', 10000)], null, 2))
    c = addLine(c, buildCartLine(dish('m2', 30000), [], null, 1))
    expect(quantityByMenuItem(c)).toEqual({ m1: 3, m2: 1 })
  })
})
