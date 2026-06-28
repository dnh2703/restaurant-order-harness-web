// Menu domain types (mirrors GET /api/qr/{qrToken}/menu response `data`).

export interface MenuOption {
  id: string
  name: string
  priceDelta: number
}

export interface OptionGroup {
  id: string
  name: string
  type: 'SINGLE' | 'MULTI'
  isRequired: boolean
  options: MenuOption[]
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
  optionGroups: OptionGroup[]
}

export interface MenuCategory {
  id: string
  name: string
  items: MenuItem[]
}

export interface Menu {
  categories: MenuCategory[]
}
