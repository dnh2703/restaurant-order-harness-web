import { describe, it, expect } from 'vitest'
import {
  defaultSelection,
  toggleOption,
  selectedOptions,
  selectionPrice,
  isSelectionValid,
} from './dish-selection'
import type { MenuItem } from './model'

const item: MenuItem = {
  id: 'm1',
  name: 'Phở bò',
  description: null,
  price: 50000,
  imageUrl: null,
  isAvailable: true,
  optionGroups: [
    {
      id: 'g-size',
      name: 'Size',
      type: 'SINGLE',
      isRequired: true,
      options: [
        { id: 's', name: 'Nhỏ', priceDelta: 0 },
        { id: 'l', name: 'Lớn', priceDelta: 10000 },
      ],
    },
    {
      id: 'g-top',
      name: 'Topping',
      type: 'MULTI',
      isRequired: false,
      options: [
        { id: 't1', name: 'Trứng', priceDelta: 5000 },
        { id: 't2', name: 'Bò viên', priceDelta: 8000 },
      ],
    },
  ],
}

describe('dish-selection', () => {
  it('pre-selects the first option of required SINGLE groups', () => {
    expect(defaultSelection(item)).toEqual({ 'g-size': ['s'] })
  })

  it('SINGLE toggle replaces the selection; MULTI toggle adds and removes', () => {
    let sel = defaultSelection(item)
    sel = toggleOption(sel, item.optionGroups[0]!, 'l')
    expect(sel['g-size']).toEqual(['l'])
    sel = toggleOption(sel, item.optionGroups[1]!, 't1')
    expect(sel['g-top']).toEqual(['t1'])
    sel = toggleOption(sel, item.optionGroups[1]!, 't2')
    expect(sel['g-top']).toEqual(['t1', 't2'])
    sel = toggleOption(sel, item.optionGroups[1]!, 't1')
    expect(sel['g-top']).toEqual(['t2'])
  })

  it('lists selected options in menu order with their price deltas', () => {
    let sel = defaultSelection(item)
    sel = toggleOption(sel, item.optionGroups[1]!, 't2')
    expect(selectedOptions(item, sel)).toEqual([
      { id: 's', name: 'Nhỏ', priceDelta: 0 },
      { id: 't2', name: 'Bò viên', priceDelta: 8000 },
    ])
  })

  it('sums the base price and selected deltas', () => {
    let sel = defaultSelection(item)
    expect(selectionPrice(item, sel)).toBe(50000)
    sel = toggleOption(sel, item.optionGroups[0]!, 'l')
    sel = toggleOption(sel, item.optionGroups[1]!, 't1')
    expect(selectionPrice(item, sel)).toBe(65000)
  })

  it('is valid only when every required group has a selection', () => {
    expect(isSelectionValid(item, defaultSelection(item))).toBe(true)
    expect(isSelectionValid(item, {})).toBe(false)
    const requiredMulti: MenuItem = {
      ...item,
      optionGroups: [{ ...item.optionGroups[1]!, isRequired: true }],
    }
    expect(isSelectionValid(requiredMulti, {})).toBe(false)
    expect(isSelectionValid(requiredMulti, { 'g-top': ['t1'] })).toBe(true)
  })
})
