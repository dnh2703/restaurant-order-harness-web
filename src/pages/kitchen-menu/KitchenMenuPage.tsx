import { useCallback, useState } from 'react'
import { MenuItemDialog } from '@/widgets/menu-admin-form'
import { MenuAdminList } from '@/widgets/menu-admin-list'
import { SideNav } from '@/widgets/side-nav'
import type { StaffUser } from '@/entities/staff'
import {
  createMenuItem,
  createOption,
  createOptionGroup,
  deleteMenuItem,
  deleteOption,
  deleteOptionGroup,
  listOptionGroups,
  updateMenuItem,
  updateOption,
  updateOptionGroup,
  type AdminCategoryView,
  type AdminMenuItemView,
  type AdminOptionGroupView,
  type SaveMenuItemInput,
  type SaveOptionGroupInput,
  type SaveOptionInput,
} from '@/shared/api/menu-admin'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Toaster,
  toast,
} from '@/shared/ui'

interface Props {
  user: StaffUser
  initialCategories: AdminCategoryView[]
  initialMenuItems: AdminMenuItemView[]
  onManageCategories: () => void
  onLogout: () => void
}

function sortCategories(categories: AdminCategoryView[]) {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'),
  )
}

function sortMenuItems(items: AdminMenuItemView[], categories: AdminCategoryView[]) {
  const sortedCategories = sortCategories(categories)
  const categoryOrder = new Map(sortedCategories.map((category, index) => [category.id, index]))
  const missingCategoryOrder = sortedCategories.length

  return [...items].sort((a, b) => {
    const categoryDiff =
      (categoryOrder.get(a.categoryId) ?? missingCategoryOrder) -
      (categoryOrder.get(b.categoryId) ?? missingCategoryOrder)
    if (categoryDiff !== 0) return categoryDiff

    const sortOrderDiff = a.sortOrder - b.sortOrder
    if (sortOrderDiff !== 0) return sortOrderDiff

    return a.name.localeCompare(b.name, 'vi')
  })
}

function toastApiError(err: unknown, fallback: string) {
  toast.error(err instanceof Error ? err.message : fallback)
}

export function KitchenMenuPage({
  user,
  initialCategories,
  initialMenuItems,
  onManageCategories,
  onLogout,
}: Props) {
  const [categories] = useState(() => sortCategories(initialCategories))
  const [menuItems, setMenuItems] = useState(() =>
    sortMenuItems(initialMenuItems, initialCategories),
  )
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AdminMenuItemView | null>(null)
  const [optionGroups, setOptionGroups] = useState<AdminOptionGroupView[]>([])
  const [optionGroupsLoading, setOptionGroupsLoading] = useState(false)
  const [deletingItem, setDeletingItem] = useState<AdminMenuItemView | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const refreshGroups = useCallback(async (menuItemId: string) => {
    try {
      const groups = await listOptionGroups({ data: { menuItemId } })
      setOptionGroups(groups)
    } catch (err) {
      toastApiError(err, 'Không tải được tùy chọn món')
    } finally {
      setOptionGroupsLoading(false)
    }
  }, [])

  const openCreateItem = useCallback(() => {
    setEditingItem(null)
    setOptionGroups([])
    setOptionGroupsLoading(false)
    setItemDialogOpen(true)
  }, [])

  const openEditItem = useCallback(
    (item: AdminMenuItemView) => {
      setEditingItem(item)
      setOptionGroups([])
      setOptionGroupsLoading(true)
      setItemDialogOpen(true)
      void refreshGroups(item.id)
    },
    [refreshGroups],
  )

  const onSaveMenuItem = useCallback(
    async (input: SaveMenuItemInput | (Partial<SaveMenuItemInput> & { id: string })) => {
      try {
        if ('id' in input) {
          const item = await updateMenuItem({ data: input })
          setMenuItems((prev) =>
            sortMenuItems(
              prev.map((current) => (current.id === item.id ? item : current)),
              categories,
            ),
          )
          toast.success('Đã cập nhật món')
          return
        }

        const item = await createMenuItem({ data: input })
        setMenuItems((prev) => sortMenuItems([...prev, item], categories))
        toast.success(`Đã thêm ${item.name}`)
      } catch (err) {
        toastApiError(err, 'Không lưu được món')
        throw err
      }
    },
    [categories],
  )

  const onDeleteMenuItem = useCallback(async () => {
    if (!deletingItem || deletingBusy) return

    setDeletingBusy(true)
    try {
      await deleteMenuItem({ data: { id: deletingItem.id } })
      setMenuItems((prev) => prev.filter((item) => item.id !== deletingItem.id))
      toast.success('Đã xóa món')
      setDeletingItem(null)
    } catch (err) {
      toastApiError(err, 'Không xóa được món')
      throw err
    } finally {
      setDeletingBusy(false)
    }
  }, [deletingBusy, deletingItem])

  const onCreateGroup = useCallback(
    async (menuItemId: string, input: SaveOptionGroupInput) => {
      try {
        await createOptionGroup({ data: { menuItemId, input } })
        await refreshGroups(menuItemId)
        toast.success('Đã thêm nhóm tùy chọn')
      } catch (err) {
        toastApiError(err, 'Không thêm được nhóm tùy chọn')
        throw err
      }
    },
    [refreshGroups],
  )

  const onUpdateGroup = useCallback(
    async (menuItemId: string, groupId: string, input: Partial<SaveOptionGroupInput>) => {
      try {
        await updateOptionGroup({ data: { menuItemId, groupId, input } })
        await refreshGroups(menuItemId)
        toast.success('Đã cập nhật nhóm tùy chọn')
      } catch (err) {
        toastApiError(err, 'Không cập nhật được nhóm tùy chọn')
        throw err
      }
    },
    [refreshGroups],
  )

  const onDeleteGroup = useCallback(
    async (menuItemId: string, groupId: string) => {
      try {
        await deleteOptionGroup({ data: { menuItemId, groupId } })
        await refreshGroups(menuItemId)
        toast.success('Đã xóa nhóm tùy chọn')
      } catch (err) {
        toastApiError(err, 'Không xóa được nhóm tùy chọn')
        throw err
      }
    },
    [refreshGroups],
  )

  const onCreateOption = useCallback(
    async (menuItemId: string, groupId: string, input: SaveOptionInput) => {
      try {
        await createOption({ data: { menuItemId, groupId, input } })
        await refreshGroups(menuItemId)
        toast.success('Đã thêm tùy chọn')
      } catch (err) {
        toastApiError(err, 'Không thêm được tùy chọn')
        throw err
      }
    },
    [refreshGroups],
  )

  const onUpdateOption = useCallback(
    async (
      menuItemId: string,
      groupId: string,
      optionId: string,
      input: Partial<SaveOptionInput>,
    ) => {
      try {
        await updateOption({ data: { menuItemId, groupId, optionId, input } })
        await refreshGroups(menuItemId)
        toast.success('Đã cập nhật tùy chọn')
      } catch (err) {
        toastApiError(err, 'Không cập nhật được tùy chọn')
        throw err
      }
    },
    [refreshGroups],
  )

  const onDeleteOption = useCallback(
    async (menuItemId: string, groupId: string, optionId: string) => {
      try {
        await deleteOption({ data: { menuItemId, groupId, optionId } })
        await refreshGroups(menuItemId)
        toast.success('Đã xóa tùy chọn')
      } catch (err) {
        toastApiError(err, 'Không xóa được tùy chọn')
        throw err
      }
    },
    [refreshGroups],
  )

  return (
    <div className="flex min-h-screen bg-page">
      <SideNav userName={user.name} userRole={user.role} onLogout={onLogout} activeSection="menu" />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Thực đơn</h1>
            <p className="text-sm text-muted">Quản lý danh mục, món ăn và tùy chọn gọi món.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onLogout} className="md:hidden">
            Đăng xuất
          </Button>
        </header>

        <section aria-label="Quản lý thực đơn">
          <MenuAdminList
            categories={categories}
            menuItems={menuItems}
            onCreateItem={openCreateItem}
            onOpenCategories={onManageCategories}
            onEditItem={openEditItem}
            onDeleteItem={(item) => setDeletingItem(item)}
          />
        </section>
      </main>
      <MenuItemDialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open)
          if (!open) {
            setEditingItem(null)
            setOptionGroups([])
            setOptionGroupsLoading(false)
          }
        }}
        categories={categories}
        item={editingItem}
        onSave={onSaveMenuItem}
        optionGroups={optionGroups}
        optionGroupsLoading={optionGroupsLoading}
        onCreateGroup={onCreateGroup}
        onUpdateGroup={onUpdateGroup}
        onDeleteGroup={onDeleteGroup}
        onCreateOption={onCreateOption}
        onUpdateOption={onUpdateOption}
        onDeleteOption={onDeleteOption}
      />
      <AlertDialog
        open={deletingItem !== null}
        onOpenChange={(next) => {
          if (!next && !deletingBusy) setDeletingItem(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {deletingItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Nếu món đang được ràng buộc, máy chủ sẽ từ chối xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Hủy</AlertDialogCancel>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onDeleteMenuItem}
              disabled={deletingBusy}
            >
              {deletingBusy ? 'Đang xóa…' : 'Xóa món'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  )
}
