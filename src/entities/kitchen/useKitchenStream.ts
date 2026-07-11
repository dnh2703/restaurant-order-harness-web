import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchKitchenQueue, fetchServedRecent } from '@/shared/api/kitchen'
import type { KitchenQueueItem, ServedItem } from './model'

export type StreamMode = 'polling' | 'error'

const POLL_MS = 2500

export function useKitchenStream(restaurantId: string): {
  queue: KitchenQueueItem[]
  served: ServedItem[]
  mode: StreamMode
  refetch: () => void
} {
  const [queue, setQueue] = useState<KitchenQueueItem[]>([])
  const [served, setServed] = useState<ServedItem[]>([])
  const [mode, setMode] = useState<StreamMode>('polling')
  const loadedRef = useRef(false)
  const disposedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const [q, s] = await Promise.all([fetchKitchenQueue(), fetchServedRecent()])
      if (disposedRef.current) return
      loadedRef.current = true
      setMode('polling')
      setQueue(q)
      setServed(s)
    } catch {
      if (disposedRef.current) return
      if (!loadedRef.current) setMode('error')
    }
  }, [])

  useEffect(() => {
    disposedRef.current = false
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => {
      disposedRef.current = true
      clearInterval(timer)
    }
  }, [restaurantId, load])

  return {
    queue,
    served,
    mode,
    refetch: () => {
      void load()
    },
  }
}
