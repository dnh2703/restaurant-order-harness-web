import { createServerFn } from '@tanstack/react-start'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'
import {
  createCategory as fetchCreateCategory,
  createMenuItem as fetchCreateMenuItem,
  createOption as fetchCreateOption,
  createOptionGroup as fetchCreateOptionGroup,
  deleteCategory as fetchDeleteCategory,
  deleteMenuItem as fetchDeleteMenuItem,
  deleteOption as fetchDeleteOption,
  deleteOptionGroup as fetchDeleteOptionGroup,
  fetchCategories,
  fetchMenuItems,
  fetchOptionGroups,
  updateCategory as fetchUpdateCategory,
  updateMenuItem as fetchUpdateMenuItem,
  updateOption as fetchUpdateOption,
  updateOptionGroup as fetchUpdateOptionGroup,
} from '@/shared/api/menu-admin.server'
import type {
  AdminCategoryView,
  AdminMenuItemView,
  AdminOptionGroupView,
  AdminOptionView,
  OptionGroupType,
  SaveCategoryInput,
  SaveMenuItemInput,
  SaveOptionGroupInput,
  SaveOptionInput,
} from '@/shared/api/types/menu-admin'

export type {
  AdminCategoryView,
  AdminMenuItemView,
  AdminOptionGroupView,
  AdminOptionView,
  OptionGroupType,
  SaveCategoryInput,
  SaveMenuItemInput,
  SaveOptionGroupInput,
  SaveOptionInput,
}

export const listCategories = createServerFn({ method: 'GET' }).handler(
  (): Promise<AdminCategoryView[]> => fetchCategories(cookieTokenStore),
)

export const createCategory = createServerFn({ method: 'POST' })
  .validator((d: SaveCategoryInput) => d)
  .handler(({ data }): Promise<AdminCategoryView> => fetchCreateCategory(cookieTokenStore, data))

export const updateCategory = createServerFn({ method: 'POST' })
  .validator((d: { id: string } & Partial<SaveCategoryInput>) => d)
  .handler(({ data }): Promise<AdminCategoryView> => fetchUpdateCategory(cookieTokenStore, data))

export const deleteCategory = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(({ data }): Promise<void> => fetchDeleteCategory(cookieTokenStore, data.id))

export const listMenuItems = createServerFn({ method: 'GET' })
  .validator((d: { categoryId?: string } | undefined) => d)
  .handler(({ data }): Promise<AdminMenuItemView[]> =>
    fetchMenuItems(cookieTokenStore, data?.categoryId),
  )

export const createMenuItem = createServerFn({ method: 'POST' })
  .validator((d: SaveMenuItemInput) => d)
  .handler(({ data }): Promise<AdminMenuItemView> => fetchCreateMenuItem(cookieTokenStore, data))

export const updateMenuItem = createServerFn({ method: 'POST' })
  .validator((d: { id: string } & Partial<SaveMenuItemInput>) => d)
  .handler(({ data }): Promise<AdminMenuItemView> => fetchUpdateMenuItem(cookieTokenStore, data))

export const deleteMenuItem = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(({ data }): Promise<void> => fetchDeleteMenuItem(cookieTokenStore, data.id))

export const listOptionGroups = createServerFn({ method: 'GET' })
  .validator((d: { menuItemId: string }) => d)
  .handler(({ data }): Promise<AdminOptionGroupView[]> =>
    fetchOptionGroups(cookieTokenStore, data.menuItemId),
  )

export const createOptionGroup = createServerFn({ method: 'POST' })
  .validator((d: { menuItemId: string; input: SaveOptionGroupInput }) => d)
  .handler(({ data }): Promise<AdminOptionGroupView> =>
    fetchCreateOptionGroup(cookieTokenStore, data.menuItemId, data.input),
  )

export const updateOptionGroup = createServerFn({ method: 'POST' })
  .validator(
    (d: { menuItemId: string; groupId: string; input: Partial<SaveOptionGroupInput> }) => d,
  )
  .handler(({ data }): Promise<AdminOptionGroupView> =>
    fetchUpdateOptionGroup(cookieTokenStore, data.menuItemId, data.groupId, data.input),
  )

export const deleteOptionGroup = createServerFn({ method: 'POST' })
  .validator((d: { menuItemId: string; groupId: string }) => d)
  .handler(({ data }): Promise<void> =>
    fetchDeleteOptionGroup(cookieTokenStore, data.menuItemId, data.groupId),
  )

export const createOption = createServerFn({ method: 'POST' })
  .validator((d: { menuItemId: string; groupId: string; input: SaveOptionInput }) => d)
  .handler(({ data }): Promise<AdminOptionView> =>
    fetchCreateOption(cookieTokenStore, data.menuItemId, data.groupId, data.input),
  )

export const updateOption = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      menuItemId: string
      groupId: string
      optionId: string
      input: Partial<SaveOptionInput>
    }) => d,
  )
  .handler(({ data }): Promise<AdminOptionView> =>
    fetchUpdateOption(cookieTokenStore, data.menuItemId, data.groupId, data.optionId, data.input),
  )

export const deleteOption = createServerFn({ method: 'POST' })
  .validator((d: { menuItemId: string; groupId: string; optionId: string }) => d)
  .handler(({ data }): Promise<void> =>
    fetchDeleteOption(cookieTokenStore, data.menuItemId, data.groupId, data.optionId),
  )
