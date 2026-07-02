import type {
  AdminCategoryView,
  AdminMenuItemView,
  AdminOptionGroupView,
  AdminOptionView,
  OptionGroupType,
} from '@/shared/api/types/menu-admin'

function toNumber(value: unknown, fallback = 0): number {
  const next = Number(value ?? fallback)
  return Number.isFinite(next) ? next : fallback
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

export function normalizeAdminCategory(raw: unknown): AdminCategoryView {
  const row = raw as { id: unknown; restaurantId: unknown; name: unknown; sortOrder: unknown }
  return {
    id: String(row.id),
    restaurantId: String(row.restaurantId),
    name: String(row.name),
    sortOrder: toNumber(row.sortOrder),
  }
}

export function normalizeAdminMenuItem(raw: unknown): AdminMenuItemView {
  const row = raw as {
    id: unknown
    categoryId: unknown
    name: unknown
    description: unknown
    price: unknown
    imageUrl: unknown
    isAvailable: unknown
    sortOrder: unknown
  }
  return {
    id: String(row.id),
    categoryId: String(row.categoryId),
    name: String(row.name),
    description: toNullableString(row.description),
    price: toNumber(row.price),
    imageUrl: toNullableString(row.imageUrl),
    isAvailable: row.isAvailable === true,
    sortOrder: toNumber(row.sortOrder),
  }
}

export function normalizeOption(raw: unknown): AdminOptionView {
  const row = raw as { id: unknown; optionGroupId: unknown; name: unknown; priceDelta: unknown }
  return {
    id: String(row.id),
    optionGroupId: String(row.optionGroupId),
    name: String(row.name),
    priceDelta: toNumber(row.priceDelta),
  }
}

export function normalizeOptionGroup(raw: unknown): AdminOptionGroupView {
  const row = raw as {
    id: unknown
    menuItemId: unknown
    name: unknown
    type: unknown
    isRequired: unknown
    options?: unknown
  }
  const options = Array.isArray(row.options) ? row.options : []
  return {
    id: String(row.id),
    menuItemId: String(row.menuItemId),
    name: String(row.name),
    type: row.type === 'MULTI' ? 'MULTI' : ('SINGLE' as OptionGroupType),
    isRequired: row.isRequired === true,
    options: options.map(normalizeOption),
  }
}
