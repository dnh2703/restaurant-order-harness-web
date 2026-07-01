import { createServerFn } from '@tanstack/react-start'
import { API_BASE_URL } from '@/shared/config'
import { toNumber } from '@/shared/lib/format'
import type { Menu } from '@/shared/api/types/menu'
import type { TableContext } from '@/shared/api/types/table'

/**
 * Server-only fetch to the Elysia backend. Runs inside server functions so the
 * browser never calls the BE directly (no CORS, BE URL stays server-side).
 */
async function fetchData<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'Invalid table' : `Backend error (${res.status})`)
  }
  const json = (await res.json()) as { data: T }
  return json.data
}

export const getTableContext = createServerFn({ method: 'GET' })
  .validator((d: { qrToken: string }) => d)
  .handler(async ({ data }) => {
    return fetchData<TableContext>(`/api/qr/${encodeURIComponent(data.qrToken)}`)
  })

export const getMenu = createServerFn({ method: 'GET' })
  .validator((d: { qrToken: string }) => d)
  .handler(async ({ data }): Promise<Menu> => {
    const menu = await fetchData<Menu>(`/api/qr/${encodeURIComponent(data.qrToken)}/menu`)
    // Normalize money fields (BE may serialize integers as strings).
    return {
      categories: menu.categories.map((c) => ({
        ...c,
        items: c.items.map((item) => ({
          ...item,
          price: toNumber(item.price),
          optionGroups: item.optionGroups.map((g) => ({
            ...g,
            options: g.options.map((o) => ({ ...o, priceDelta: toNumber(o.priceDelta) })),
          })),
        })),
      })),
    }
  })
