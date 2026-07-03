import { describe, expect, it } from 'vitest'
import {
  normalizeAdminCategory,
  normalizeAdminMenuItem,
  normalizeOptionGroup,
} from './menu-admin-normalize'

describe('menu admin normalizers', () => {
  it('coerces category sortOrder from string', () => {
    expect(
      normalizeAdminCategory({
        id: 'c1',
        restaurantId: 'r1',
        name: 'Món chính',
        sortOrder: '2',
      }),
    ).toEqual({ id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 2 })
  })

  it('coerces menu item price/sort order and preserves nullable fields', () => {
    expect(
      normalizeAdminMenuItem({
        id: 'm1',
        categoryId: 'c1',
        name: 'Phở bò',
        description: null,
        price: '65000',
        imageUrl: null,
        isAvailable: true,
        sortOrder: '3',
      }),
    ).toEqual({
      id: 'm1',
      categoryId: 'c1',
      name: 'Phở bò',
      description: null,
      price: 65000,
      imageUrl: null,
      isAvailable: true,
      sortOrder: 3,
    })
  })

  it('normalizes option groups and option price deltas', () => {
    expect(
      normalizeOptionGroup({
        id: 'g1',
        menuItemId: 'm1',
        name: 'Size',
        type: 'SINGLE',
        isRequired: true,
        options: [{ id: 'o1', optionGroupId: 'g1', name: 'Lớn', priceDelta: '10000' }],
      }),
    ).toMatchObject({
      id: 'g1',
      type: 'SINGLE',
      options: [{ priceDelta: 10000 }],
    })
  })
})
