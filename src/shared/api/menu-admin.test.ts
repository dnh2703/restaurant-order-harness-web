import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TokenStore } from '@/shared/lib/staff-auth.server'
import {
  MenuAdminApiError,
  createCategory,
  createMenuItem,
  createOption,
  createOptionGroup,
  deleteMenuItem,
  listCategories,
  listMenuItems,
  updateMenuItem,
} from './menu-admin.server'

function fakeStore(): TokenStore {
  return {
    getAccess: () => 'A',
    getRefresh: () => 'R',
    save: () => {},
    clear: () => {},
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => vi.restoreAllMocks())

describe('menu admin API helpers', () => {
  it('lists categories and menu items normalized', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            categories: [{ id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: '2' }],
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            menuItems: [
              {
                id: 'm1',
                categoryId: 'c1',
                name: 'Phở bò',
                description: '',
                price: '65000',
                imageUrl: null,
                isAvailable: true,
                sortOrder: '3',
              },
            ],
          },
        }),
      )

    await expect(listCategories(fakeStore())).resolves.toEqual([
      { id: 'c1', restaurantId: 'r1', name: 'Món chính', sortOrder: 2 },
    ])
    await expect(listMenuItems(fakeStore(), 'c1')).resolves.toMatchObject([
      { id: 'm1', description: null, price: 65000, sortOrder: 3 },
    ])
    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      'http://localhost:3000/api/menu-items/?categoryId=c1',
    )
  })

  it('posts category and dish payloads', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: { category: { id: 'c1', restaurantId: 'r1', name: 'Đồ uống', sortOrder: 1 } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            menuItem: {
              id: 'm1',
              categoryId: 'c1',
              name: 'Trà đào',
              description: null,
              price: 35000,
              imageUrl: null,
              isAvailable: true,
              sortOrder: 1,
            },
          },
        }),
      )

    await createCategory(fakeStore(), { name: 'Đồ uống', sortOrder: 1 })
    await createMenuItem(fakeStore(), {
      categoryId: 'c1',
      name: 'Trà đào',
      price: 35000,
      isAvailable: true,
    })

    const categoryInit = fetchMock.mock.calls[0]![1] as RequestInit
    const dishInit = fetchMock.mock.calls[1]![1] as RequestInit
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://localhost:3000/api/categories/')
    expect(categoryInit.method).toBe('POST')
    expect(JSON.parse(categoryInit.body as string)).toEqual({ name: 'Đồ uống', sortOrder: 1 })
    expect(String(fetchMock.mock.calls[1]![0])).toBe('http://localhost:3000/api/menu-items/')
    expect(dishInit.method).toBe('POST')
    expect(JSON.parse(dishInit.body as string)).toEqual({
      categoryId: 'c1',
      name: 'Trà đào',
      price: 35000,
      isAvailable: true,
    })
  })

  it('patches and deletes menu items', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            menuItem: {
              id: 'm 1',
              categoryId: 'c1',
              name: 'Phở tái',
              description: null,
              price: 70000,
              imageUrl: null,
              isAvailable: false,
              sortOrder: 1,
            },
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await updateMenuItem(fakeStore(), { id: 'm 1', name: 'Phở tái', isAvailable: false })
    await deleteMenuItem(fakeStore(), 'm 1')

    const patchInit = fetchMock.mock.calls[0]![1] as RequestInit
    const deleteInit = fetchMock.mock.calls[1]![1] as RequestInit
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://localhost:3000/api/menu-items/m%201')
    expect(patchInit.method).toBe('PATCH')
    expect(JSON.parse(patchInit.body as string)).toEqual({ name: 'Phở tái', isAvailable: false })
    expect(String(fetchMock.mock.calls[1]![0])).toBe('http://localhost:3000/api/menu-items/m%201')
    expect(deleteInit.method).toBe('DELETE')
  })

  it('creates option groups and options', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            optionGroup: {
              id: 'g1',
              menuItemId: 'm1',
              name: 'Size',
              type: 'SINGLE',
              isRequired: true,
              options: [],
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { option: { id: 'o1', optionGroupId: 'g1', name: 'Lớn', priceDelta: '10000' } },
        }),
      )

    await createOptionGroup(fakeStore(), 'm1', { name: 'Size', type: 'SINGLE', isRequired: true })
    await createOption(fakeStore(), 'm1', 'g1', { name: 'Lớn', priceDelta: 10000 })

    const groupInit = fetchMock.mock.calls[0]![1] as RequestInit
    const optionInit = fetchMock.mock.calls[1]![1] as RequestInit
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      'http://localhost:3000/api/menu-items/m1/option-groups',
    )
    expect(groupInit.method).toBe('POST')
    expect(JSON.parse(groupInit.body as string)).toEqual({
      name: 'Size',
      type: 'SINGLE',
      isRequired: true,
    })
    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      'http://localhost:3000/api/menu-items/m1/option-groups/g1/options',
    )
    expect(optionInit.method).toBe('POST')
    expect(JSON.parse(optionInit.body as string)).toEqual({ name: 'Lớn', priceDelta: 10000 })
  })

  it('maps backend errors to MenuAdminApiError messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'MENU_ITEM_IN_USE', message: 'raw message' } }, 409),
    )

    await expect(deleteMenuItem(fakeStore(), 'm1')).rejects.toMatchObject({
      name: 'MenuAdminApiError',
      code: 'MENU_ITEM_IN_USE',
      status: 409,
      message: 'Món đã từng được gọi, không thể xóa',
    } satisfies Partial<MenuAdminApiError>)
  })
})
