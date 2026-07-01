import { toNumber } from '@/shared/lib/format'

export type KitchenStatus = 'PENDING' | 'COOKING'

export interface KitchenOption {
  optionName: string
  priceDelta: number
}

export interface KitchenQueueItem {
  id: string
  tableName: string
  nameSnapshot: string
  quantity: number
  note: string | null
  status: KitchenStatus
  createdAt: string
  options: KitchenOption[]
}

export interface ServedItem {
  id: string
  tableName: string
  nameSnapshot: string
  quantity: number
  note: string | null
  servedAt: string
  options: KitchenOption[]
}

function mapOptions(raw: unknown): KitchenOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((o) => {
    const opt = o as { optionName: unknown; priceDelta: unknown }
    return { optionName: String(opt.optionName), priceDelta: toNumber(opt.priceDelta) }
  })
}

export function normalizeQueueItem(raw: unknown): KitchenQueueItem {
  const r = raw as Record<string, unknown>
  return {
    id: String(r.id),
    tableName: String(r.tableName),
    nameSnapshot: String(r.nameSnapshot),
    quantity: toNumber(r.quantity),
    note: (r.note as string | null) ?? null,
    status: r.status as KitchenStatus,
    createdAt: String(r.createdAt),
    options: mapOptions(r.options),
  }
}

export function normalizeServedItem(raw: unknown): ServedItem {
  const r = raw as Record<string, unknown>
  return {
    id: String(r.id),
    tableName: String(r.tableName),
    nameSnapshot: String(r.nameSnapshot),
    quantity: toNumber(r.quantity),
    note: (r.note as string | null) ?? null,
    servedAt: String(r.servedAt),
    options: mapOptions(r.options),
  }
}
