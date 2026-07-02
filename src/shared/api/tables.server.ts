import { authedFetch, type TokenStore } from '@/shared/lib/staff-auth.server'
import { normalizeAdminTable } from '@/shared/api/tables-normalize'
import type { AdminTableView } from '@/shared/api/types/admin-table'

export class TablesApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'TablesApiError'
  }
}

function mapTableErrorCode(code?: string): string | undefined {
  switch (code) {
    case 'TABLE_NOT_FOUND':
      return 'Không tìm thấy bàn'
    case 'TABLE_IN_USE':
      return 'Bàn đang có đơn, không thể xóa'
    case 'FORBIDDEN':
      return 'Bạn không có quyền truy cập'
    case 'UNAUTHORIZED':
      return 'Phiên đăng nhập hết hạn'
    default:
      return undefined
  }
}

async function readError(res: Response): Promise<never> {
  let code: string | undefined
  let message = `Lỗi (${res.status})`
  try {
    const json = (await res.json()) as { error?: { code?: string; message?: string } }
    code = json.error?.code
    message = mapTableErrorCode(code) ?? json.error?.message ?? message
  } catch {
    // ignore parse errors
  }
  throw new TablesApiError(message, code, res.status)
}

async function readTable(res: Response): Promise<AdminTableView> {
  if (!res.ok) await readError(res)
  const json = (await res.json()) as { data: { table: unknown } }
  return normalizeAdminTable(json.data.table)
}

export async function fetchTables(store: TokenStore): Promise<AdminTableView[]> {
  const res = await authedFetch(store, '/api/tables')
  if (!res.ok) await readError(res)
  const json = (await res.json()) as { data: { tables: unknown[] } }
  return json.data.tables.map(normalizeAdminTable)
}

export async function fetchCreateTable(
  store: TokenStore,
  input: { name: string; capacity?: number | null },
): Promise<AdminTableView> {
  const res = await authedFetch(store, '/api/tables', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return readTable(res)
}

export async function fetchUpdateTable(
  store: TokenStore,
  input: { id: string; name?: string; capacity?: number | null },
): Promise<AdminTableView> {
  const { id, ...body } = input
  const res = await authedFetch(store, `/api/tables/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readTable(res)
}

export async function fetchDeleteTable(store: TokenStore, id: string): Promise<void> {
  const res = await authedFetch(store, `/api/tables/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) await readError(res)
}

export async function fetchRegenerateTableQr(
  store: TokenStore,
  id: string,
): Promise<AdminTableView> {
  const res = await authedFetch(store, `/api/tables/${encodeURIComponent(id)}/regenerate-qr`, {
    method: 'POST',
  })
  return readTable(res)
}

export type { AdminTableView }
