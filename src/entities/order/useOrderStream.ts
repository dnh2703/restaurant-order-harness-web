// src/entities/order/useOrderStream.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { getOrder } from '@/shared/api/order'
import type { Order } from './model'

export type StreamMode = 'polling' | 'error'

const POLL_MS = 2500

export function useOrderStream(qrToken: string): {
  order: Order | null
  mode: StreamMode
  refetch: () => void
} {
  const [order, setOrder] = useState<Order | null>(null)
  const [mode, setMode] = useState<StreamMode>('polling')
  const orderRef = useRef<Order | null>(null)
  const disposedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const next = await getOrder({ data: { qrToken } })
      if (disposedRef.current) return
      orderRef.current = next
      setMode('polling')
      setOrder(next)
    } catch {
      if (disposedRef.current) return
      if (!orderRef.current) setMode('error')
    }
  }, [qrToken])

  useEffect(() => {
    disposedRef.current = false
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => {
      disposedRef.current = true
      clearInterval(timer)
    }
  }, [qrToken, load])

  return {
    order,
    mode,
    refetch: () => {
      void load()
    },
  }
}
