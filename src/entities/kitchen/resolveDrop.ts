import type { KitchenStatus } from './model'

export type BoardColumn = 'PENDING' | 'COOKING' | 'SERVED'

/**
 * Forward-only, single-step transitions for drag-and-drop.
 * Returns the target status to advance to, or null for a no-op.
 */
export function resolveDrop(from: KitchenStatus, target: BoardColumn): 'COOKING' | 'SERVED' | null {
  if (from === 'PENDING' && target === 'COOKING') return 'COOKING'
  if (from === 'COOKING' && target === 'SERVED') return 'SERVED'
  return null
}
