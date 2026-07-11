import { useCallback, useEffect, useRef, useState } from 'react'
import { getOpenTables } from '@/shared/api/cashier'
import type { CashierTable } from './model'

export type StreamMode = 'polling' | 'error'

const POLL_MS = 2500

export function useOpenTables(restaurantId: string): {
  tables: CashierTable[]
  mode: StreamMode
  refetch: () => void
} {
  const [tables, setTables] = useState<CashierTable[]>([])
  const [mode, setMode] = useState<StreamMode>('polling')
  const loadedRef = useRef(false)
  const disposedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const next = await getOpenTables()
      if (disposedRef.current) return
      loadedRef.current = true
      setMode('polling')
      setTables(next)
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
    tables,
    mode,
    refetch: () => {
      void load()
    },
  }
}
