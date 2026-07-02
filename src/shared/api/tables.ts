import { createServerFn } from '@tanstack/react-start'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'
import {
  fetchCreateTable,
  fetchDeleteTable,
  fetchRegenerateTableQr,
  fetchTables,
  fetchUpdateTable,
  type AdminTableView,
} from '@/shared/api/tables.server'

export type { AdminTableView }

export const listTables = createServerFn({ method: 'GET' }).handler((): Promise<AdminTableView[]> =>
  fetchTables(cookieTokenStore),
)

export const createTable = createServerFn({ method: 'POST' })
  .validator((d: { name: string; capacity?: number | null }) => d)
  .handler(({ data }): Promise<AdminTableView> => fetchCreateTable(cookieTokenStore, data))

export const updateTable = createServerFn({ method: 'POST' })
  .validator((d: { id: string; name?: string; capacity?: number | null }) => d)
  .handler(({ data }): Promise<AdminTableView> => fetchUpdateTable(cookieTokenStore, data))

export const deleteTable = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(({ data }): Promise<void> => fetchDeleteTable(cookieTokenStore, data.id))

export const regenerateTableQr = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(({ data }): Promise<AdminTableView> => fetchRegenerateTableQr(cookieTokenStore, data.id))
