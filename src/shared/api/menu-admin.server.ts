import { authedFetch, type TokenStore } from '@/shared/lib/staff-auth.server'
import {
  normalizeAdminCategory,
  normalizeAdminMenuItem,
  normalizeOption,
  normalizeOptionGroup,
} from '@/shared/api/menu-admin-normalize'
import type {
  AdminCategoryView,
  AdminMenuItemView,
  AdminOptionGroupView,
  AdminOptionView,
  SaveCategoryInput,
  SaveMenuItemInput,
  SaveOptionGroupInput,
  SaveOptionInput,
} from '@/shared/api/types/menu-admin'

export class MenuAdminApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'MenuAdminApiError'
  }
}

function mapMenuAdminErrorCode(code?: string): string | undefined {
  switch (code) {
    case 'CATEGORY_NOT_FOUND':
      return 'Không tìm thấy danh mục'
    case 'CATEGORY_IN_USE':
      return 'Danh mục đang có món, không thể xóa'
    case 'MENU_ITEM_NOT_FOUND':
      return 'Không tìm thấy món'
    case 'MENU_ITEM_IN_USE':
      return 'Món đã từng được gọi, không thể xóa'
    case 'OPTION_GROUP_NOT_FOUND':
      return 'Không tìm thấy nhóm tùy chọn'
    case 'OPTION_NOT_FOUND':
      return 'Không tìm thấy tùy chọn'
    case 'IMAGE_MISSING':
      return 'Chưa chọn ảnh'
    case 'IMAGE_TYPE_UNSUPPORTED':
      return 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP'
    case 'IMAGE_TOO_LARGE':
      return 'Ảnh vượt quá 5 MB'
    case 'STORAGE_UNAVAILABLE':
      return 'Lưu trữ tạm thời không khả dụng, vui lòng thử lại'
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
    message = mapMenuAdminErrorCode(code) ?? json.error?.message ?? message
  } catch {
    // ignore parse errors
  }
  throw new MenuAdminApiError(message, code, res.status)
}

async function readJsonData<T>(res: Response): Promise<T> {
  if (!res.ok) await readError(res)
  const json = (await res.json()) as { data: T }
  return json.data
}

async function readCategory(res: Response): Promise<AdminCategoryView> {
  const data = await readJsonData<{ category: unknown }>(res)
  return normalizeAdminCategory(data.category)
}

async function readMenuItem(res: Response): Promise<AdminMenuItemView> {
  const data = await readJsonData<{ menuItem: unknown }>(res)
  return normalizeAdminMenuItem(data.menuItem)
}

async function readOptionGroup(res: Response): Promise<AdminOptionGroupView> {
  const data = await readJsonData<{ optionGroup: unknown }>(res)
  return normalizeOptionGroup(data.optionGroup)
}

async function readOption(res: Response): Promise<AdminOptionView> {
  const data = await readJsonData<{ option: unknown }>(res)
  return normalizeOption(data.option)
}

function jsonInit(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function listCategories(store: TokenStore): Promise<AdminCategoryView[]> {
  const data = await readJsonData<{ categories: unknown[] }>(
    await authedFetch(store, '/api/categories/'),
  )
  return data.categories.map(normalizeAdminCategory)
}

export async function createCategory(
  store: TokenStore,
  input: SaveCategoryInput,
): Promise<AdminCategoryView> {
  return readCategory(await authedFetch(store, '/api/categories/', jsonInit('POST', input)))
}

export async function updateCategory(
  store: TokenStore,
  input: { id: string } & Partial<SaveCategoryInput>,
): Promise<AdminCategoryView> {
  const { id, ...body } = input
  return readCategory(
    await authedFetch(store, `/api/categories/${encodeURIComponent(id)}`, jsonInit('PATCH', body)),
  )
}

export async function deleteCategory(store: TokenStore, id: string): Promise<void> {
  const res = await authedFetch(store, `/api/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) await readError(res)
}

export async function listMenuItems(
  store: TokenStore,
  categoryId?: string,
): Promise<AdminMenuItemView[]> {
  const path = categoryId
    ? `/api/menu-items/?categoryId=${encodeURIComponent(categoryId)}`
    : '/api/menu-items/'
  const data = await readJsonData<{ menuItems: unknown[] }>(await authedFetch(store, path))
  return data.menuItems.map(normalizeAdminMenuItem)
}

export async function createMenuItem(
  store: TokenStore,
  input: SaveMenuItemInput,
): Promise<AdminMenuItemView> {
  return readMenuItem(await authedFetch(store, '/api/menu-items/', jsonInit('POST', input)))
}

export async function updateMenuItem(
  store: TokenStore,
  input: { id: string } & Partial<SaveMenuItemInput>,
): Promise<AdminMenuItemView> {
  const { id, ...body } = input
  return readMenuItem(
    await authedFetch(store, `/api/menu-items/${encodeURIComponent(id)}`, jsonInit('PATCH', body)),
  )
}

export async function deleteMenuItem(store: TokenStore, id: string): Promise<void> {
  const res = await authedFetch(store, `/api/menu-items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) await readError(res)
}

/**
 * Upload a dish image as multipart/form-data and return the public URL.
 * The `Content-Type` header is intentionally omitted so the runtime sets the multipart
 * boundary; `authedFetch` only adds the Authorization header.
 */
export async function uploadMenuItemImage(store: TokenStore, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await authedFetch(store, '/api/menu-items/image', { method: 'POST', body: form })
  const data = await readJsonData<{ url: string }>(res)
  return data.url
}

export async function listOptionGroups(
  store: TokenStore,
  menuItemId: string,
): Promise<AdminOptionGroupView[]> {
  const data = await readJsonData<{ optionGroups: unknown[] }>(
    await authedFetch(store, `/api/menu-items/${encodeURIComponent(menuItemId)}/option-groups`),
  )
  return data.optionGroups.map(normalizeOptionGroup)
}

export async function createOptionGroup(
  store: TokenStore,
  menuItemId: string,
  input: SaveOptionGroupInput,
): Promise<AdminOptionGroupView> {
  return readOptionGroup(
    await authedFetch(
      store,
      `/api/menu-items/${encodeURIComponent(menuItemId)}/option-groups`,
      jsonInit('POST', input),
    ),
  )
}

export async function updateOptionGroup(
  store: TokenStore,
  menuItemId: string,
  groupId: string,
  input: Partial<SaveOptionGroupInput>,
): Promise<AdminOptionGroupView> {
  return readOptionGroup(
    await authedFetch(
      store,
      `/api/menu-items/${encodeURIComponent(menuItemId)}/option-groups/${encodeURIComponent(groupId)}`,
      jsonInit('PATCH', input),
    ),
  )
}

export async function deleteOptionGroup(
  store: TokenStore,
  menuItemId: string,
  groupId: string,
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/menu-items/${encodeURIComponent(menuItemId)}/option-groups/${encodeURIComponent(groupId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) await readError(res)
}

export async function createOption(
  store: TokenStore,
  menuItemId: string,
  groupId: string,
  input: SaveOptionInput,
): Promise<AdminOptionView> {
  return readOption(
    await authedFetch(
      store,
      `/api/menu-items/${encodeURIComponent(menuItemId)}/option-groups/${encodeURIComponent(groupId)}/options`,
      jsonInit('POST', input),
    ),
  )
}

export async function updateOption(
  store: TokenStore,
  menuItemId: string,
  groupId: string,
  optionId: string,
  input: Partial<SaveOptionInput>,
): Promise<AdminOptionView> {
  return readOption(
    await authedFetch(
      store,
      `/api/menu-items/${encodeURIComponent(menuItemId)}/option-groups/${encodeURIComponent(groupId)}/options/${encodeURIComponent(optionId)}`,
      jsonInit('PATCH', input),
    ),
  )
}

export async function deleteOption(
  store: TokenStore,
  menuItemId: string,
  groupId: string,
  optionId: string,
): Promise<void> {
  const res = await authedFetch(
    store,
    `/api/menu-items/${encodeURIComponent(menuItemId)}/option-groups/${encodeURIComponent(groupId)}/options/${encodeURIComponent(optionId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) await readError(res)
}

export type {
  AdminCategoryView,
  AdminMenuItemView,
  AdminOptionGroupView,
  AdminOptionView,
  SaveCategoryInput,
  SaveMenuItemInput,
  SaveOptionGroupInput,
  SaveOptionInput,
}
