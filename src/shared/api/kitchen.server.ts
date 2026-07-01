import { authedFetch, type TokenStore } from '@/shared/lib/staff-auth.server'
import {
  normalizeQueueItem,
  normalizeServedItem,
  type KitchenQueueItem,
  type ServedItem,
} from '@/entities/kitchen/model'

export interface KitchenMenuItem {
  id: string
  name: string
  isAvailable: boolean
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Backend error (${res.status})`)
  const json = (await res.json()) as { data: T }
  return json.data
}

export async function fetchQueue(store: TokenStore): Promise<KitchenQueueItem[]> {
  const data = await readJson<{ items: unknown[] }>(await authedFetch(store, '/api/kitchen/queue'))
  return data.items.map(normalizeQueueItem)
}

/** Served list is best-effort: a missing/erroring endpoint degrades to []. */
export async function fetchServed(store: TokenStore): Promise<ServedItem[]> {
  try {
    const res = await authedFetch(store, '/api/kitchen/served-recent')
    if (!res.ok) return []
    const json = (await res.json()) as { data: { items: unknown[] } }
    return json.data.items.map(normalizeServedItem)
  } catch {
    return []
  }
}

export async function advanceItem(
  store: TokenStore,
  input: { id: string; status: 'COOKING' | 'SERVED' },
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/kitchen/order-items/${encodeURIComponent(input.id)}/status`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: input.status }),
    },
  )
  if (!res.ok) throw new Error(`Không cập nhật được món (${res.status})`)
}

export async function fetchMenuItems(store: TokenStore): Promise<KitchenMenuItem[]> {
  const data = await readJson<{
    menuItems: { id: unknown; name: unknown; isAvailable: unknown }[]
  }>(await authedFetch(store, '/api/menu-items/'))
  return data.menuItems.map((m) => ({
    id: String(m.id),
    name: String(m.name),
    isAvailable: Boolean(m.isAvailable),
  }))
}

export async function setAvailability(
  store: TokenStore,
  input: { id: string; isAvailable: boolean },
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/kitchen/menu-items/${encodeURIComponent(input.id)}/availability`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isAvailable: input.isAvailable }),
    },
  )
  if (!res.ok) throw new Error(`Không cập nhật được trạng thái món (${res.status})`)
}
