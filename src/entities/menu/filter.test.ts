import { describe, it, expect } from 'vitest'
import { filterMenu, countItems } from './filter'
import type { Menu } from './model'

const menu: Menu = {
  categories: [
    {
      id: 'c1',
      name: 'Khai vị',
      items: [
        {
          id: 'i1',
          name: 'Gỏi cuốn',
          description: null,
          price: 45000,
          imageUrl: null,
          isAvailable: true,
          optionGroups: [],
        },
      ],
    },
    {
      id: 'c2',
      name: 'Món chính',
      items: [
        {
          id: 'i2',
          name: 'Phở bò',
          description: null,
          price: 50000,
          imageUrl: null,
          isAvailable: true,
          optionGroups: [],
        },
        {
          id: 'i3',
          name: 'Bún chả',
          description: null,
          price: 45000,
          imageUrl: null,
          isAvailable: false,
          optionGroups: [],
        },
      ],
    },
  ],
}

describe('countItems', () => {
  it('counts items across categories', () => {
    expect(countItems(menu)).toBe(3)
  })
})

describe('filterMenu', () => {
  it('returns all when q empty and cat all', () => {
    expect(countItems(filterMenu(menu, { q: '', cat: 'all' }))).toBe(3)
  })
  it('filters by category id', () => {
    const r = filterMenu(menu, { q: '', cat: 'c1' })
    expect(r.categories).toHaveLength(1)
    expect(r.categories[0]!.id).toBe('c1')
  })
  it('filters by name diacritic-insensitive and drops empty categories', () => {
    const r = filterMenu(menu, { q: 'pho', cat: 'all' })
    expect(countItems(r)).toBe(1)
    expect(r.categories).toHaveLength(1)
    expect(r.categories[0]!.items[0]!.name).toBe('Phở bò')
  })
})
