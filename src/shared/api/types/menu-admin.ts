export type OptionGroupType = 'SINGLE' | 'MULTI'

export interface AdminCategoryView {
  id: string
  restaurantId: string
  name: string
  sortOrder: number
}

export interface AdminMenuItemView {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
  sortOrder: number
}

export interface AdminOptionView {
  id: string
  optionGroupId: string
  name: string
  priceDelta: number
}

export interface AdminOptionGroupView {
  id: string
  menuItemId: string
  name: string
  type: OptionGroupType
  isRequired: boolean
  options: AdminOptionView[]
}

export interface SaveCategoryInput {
  name: string
  sortOrder?: number
}

export interface SaveMenuItemInput {
  categoryId: string
  name: string
  price: number
  description?: string | null
  imageUrl?: string | null
  isAvailable?: boolean
  sortOrder?: number
}

export interface SaveOptionGroupInput {
  name: string
  type: OptionGroupType
  isRequired?: boolean
}

export interface SaveOptionInput {
  name: string
  priceDelta?: number
}
