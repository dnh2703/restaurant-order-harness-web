import { useCallback, useEffect, useMemo, useState } from 'react'
import { advanceOrderItemStatus } from '@/shared/api/kitchen'
import { useKitchenStream, type StreamMode } from './useKitchenStream'
import type { KitchenQueueItem, ServedItem } from './model'

type AdvanceStatus = 'COOKING' | 'SERVED'
interface Override {
  status: AdvanceStatus
  at: string
}

export function useKitchenQueue(restaurantId: string): {
  pending: KitchenQueueItem[]
  cooking: KitchenQueueItem[]
  served: ServedItem[]
  mode: StreamMode
  advance: (id: string, status: AdvanceStatus) => Promise<void>
} {
  const { queue, served: servedServer, mode, refetch } = useKitchenStream(restaurantId)
  const [overrides, setOverrides] = useState<Record<string, Override>>({})

  // Drop overrides the server has already caught up to. Prevents flicker and
  // stops overrides from lingering once the stream reflects the new state.
  useEffect(() => {
    setOverrides((prev) => {
      const ids = Object.keys(prev)
      if (ids.length === 0) return prev
      const next = { ...prev }
      let changed = false
      for (const id of ids) {
        const qItem = queue.find((i) => i.id === id)
        if (prev[id]!.status === 'COOKING') {
          if (!qItem || qItem.status === 'COOKING') {
            delete next[id]
            changed = true
          }
        } else if (servedServer.some((s) => s.id === id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [queue, servedServer])

  const { pending, cooking, served } = useMemo(() => {
    const pending: KitchenQueueItem[] = []
    const cooking: KitchenQueueItem[] = []
    const optimisticServed: ServedItem[] = []
    for (const item of queue) {
      const ov = overrides[item.id]
      if (ov?.status === 'SERVED') {
        optimisticServed.push({
          id: item.id,
          tableName: item.tableName,
          nameSnapshot: item.nameSnapshot,
          quantity: item.quantity,
          note: item.note,
          options: item.options,
          servedAt: ov.at,
        })
      } else if (ov?.status === 'COOKING' || item.status === 'COOKING') {
        cooking.push({ ...item, status: 'COOKING' })
      } else {
        pending.push(item)
      }
    }
    const serverIds = new Set(servedServer.map((s) => s.id))
    const merged = [...servedServer, ...optimisticServed.filter((o) => !serverIds.has(o.id))]
    return { pending, cooking, served: merged }
  }, [queue, servedServer, overrides])

  const advance = useCallback(
    async (id: string, status: AdvanceStatus) => {
      const at = new Date().toISOString()
      setOverrides((prev) => ({ ...prev, [id]: { status, at } }))
      try {
        await advanceOrderItemStatus({ data: { id, status } })
        refetch()
      } catch (e) {
        setOverrides((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        throw e
      }
    },
    [refetch],
  )

  return { pending, cooking, served, mode, advance }
}
