import type { AdminTableView, TableStatus } from '@/shared/api/types/admin-table'

export function normalizeAdminTable(raw: unknown): AdminTableView {
  const row = raw as {
    id: unknown
    name: unknown
    capacity: unknown
    qrToken: unknown
    status: unknown
  }
  const capacity = row.capacity === null || row.capacity === undefined ? null : Number(row.capacity)
  return {
    id: String(row.id),
    name: String(row.name),
    capacity: capacity === null || Number.isNaN(capacity) ? null : capacity,
    qrToken: String(row.qrToken),
    status: row.status === 'OCCUPIED' ? 'OCCUPIED' : 'EMPTY',
  }
}

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  EMPTY: 'Trống',
  OCCUPIED: 'Có khách',
}
