import { createServerFn } from '@tanstack/react-start'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'
import {
  advanceItem,
  fetchMenuItems,
  fetchQueue,
  fetchServed,
  setAvailability,
  type KitchenMenuItem,
  type KitchenQueueItem,
  type ServedItem,
} from '@/shared/api/kitchen.server'

export type { KitchenMenuItem, KitchenQueueItem, ServedItem }

export const fetchKitchenQueue = createServerFn({ method: 'GET' }).handler(
  (): Promise<KitchenQueueItem[]> => fetchQueue(cookieTokenStore),
)

export const fetchServedRecent = createServerFn({ method: 'GET' }).handler(
  (): Promise<ServedItem[]> => fetchServed(cookieTokenStore),
)

export const advanceOrderItemStatus = createServerFn({ method: 'POST' })
  .validator((d: { id: string; status: 'COOKING' | 'SERVED' }) => d)
  .handler(({ data }): Promise<void> => advanceItem(cookieTokenStore, data))

export const listMenuItemsForKitchen = createServerFn({ method: 'GET' }).handler(
  (): Promise<KitchenMenuItem[]> => fetchMenuItems(cookieTokenStore),
)

export const setMenuItemAvailability = createServerFn({ method: 'POST' })
  .validator((d: { id: string; isAvailable: boolean }) => d)
  .handler(({ data }): Promise<void> => setAvailability(cookieTokenStore, data))
