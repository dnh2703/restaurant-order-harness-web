import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchKitchenQueue, fetchServedRecent } from '@/shared/api/kitchen'
import type { KitchenQueueItem, ServedItem } from './model'

export type StreamMode = 'live' | 'polling' | 'error'

const POLL_MS = 2500
const RECONNECT_MS = 5000

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
      setQueue(q)
      setServed(s)
    } catch {
      if (disposedRef.current) return
      if (!loadedRef.current) setMode('error')
    }
  }, [])

  useEffect(() => {
    disposedRef.current = false
    let stream: EventSource | null = null
    let pollTimer: ReturnType<typeof setInterval> | undefined
    let reconnectTimer: ReturnType<typeof setInterval> | undefined
    let disposed = false

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer)
      if (reconnectTimer) clearInterval(reconnectTimer)
      pollTimer = undefined
      reconnectTimer = undefined
    }

    const startPolling = () => {
      if (pollTimer || disposed) return
      setMode('polling')
      pollTimer = setInterval(() => void load(), POLL_MS)
      reconnectTimer = setInterval(connect, RECONNECT_MS)
    }

    function connect() {
      if (disposed) return
      stream?.close()
      const es = new EventSource(`/api/stream/restaurant/${encodeURIComponent(restaurantId)}`)
      stream = es
      es.onopen = () => {
        stopPolling()
        setMode('live')
      }
      es.addEventListener('order_item.updated', () => void load())
      es.onerror = () => {
        es.close()
        if (stream === es) stream = null
        startPolling()
      }
    }

    void load()
    connect()

    return () => {
      disposed = true
      disposedRef.current = true
      stopPolling()
      stream?.close()
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
