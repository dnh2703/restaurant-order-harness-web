// src/entities/order/useOrderStream.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { getOrder } from '@/shared/api/order'
import type { Order } from './model'

export type StreamMode = 'live' | 'polling' | 'error'

const POLL_MS = 2500
const RECONNECT_MS = 5000

export function useOrderStream(qrToken: string): {
  order: Order | null
  mode: StreamMode
  refetch: () => void
} {
  const [order, setOrder] = useState<Order | null>(null)
  const [mode, setMode] = useState<StreamMode>('polling')
  const orderRef = useRef<Order | null>(null)
  // Fix 2: track whether the component has unmounted to guard post-await setState
  const disposedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const next = await getOrder({ data: { qrToken } })
      if (disposedRef.current) return false
      orderRef.current = next
      setOrder(next)
      return true
    } catch {
      if (disposedRef.current) return false
      if (!orderRef.current) setMode('error')
      return false
    }
  }, [qrToken])

  useEffect(() => {
    // Fix 2: re-enable updates at the start of each effect run (re-mount with same token)
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
      // Fix 1: close the previous EventSource before creating a new one
      stream?.close()
      const es = new EventSource(`/api/qr/${encodeURIComponent(qrToken)}/stream`)
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
      // Fix 2: mark as disposed so in-flight load() calls skip setState
      disposedRef.current = true
      stopPolling()
      stream?.close()
    }
  }, [qrToken, load])

  // Fix 4: wrap load so the public refetch: () => void doesn't leak a Promise<boolean>
  return {
    order,
    mode,
    refetch: () => {
      void load()
    },
  }
}
