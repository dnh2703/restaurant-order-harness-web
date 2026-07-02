import { useCallback, useState } from 'react'
import { CategoryAdminDialog } from '@/widgets/category-admin-dialog'
import { MenuAdminList } from '@/widgets/menu-admin-list'
import { SideNav } from '@/widgets/side-nav'
import type { StaffUser } from '@/entities/staff'
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type AdminCategoryView,
  type AdminMenuItemView,
  type SaveCategoryInput,
} from '@/shared/api/menu-admin'
import { Button, Toaster, toast } from '@/shared/ui'

interface Props {
  user: StaffUser
  initialCategories: AdminCategoryView[]
  initialMenuItems: AdminMenuItemView[]
  onLogout: () => void
}

function sortCategories(categories: AdminCategoryView[]) {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'),
  )
}

function toastApiError(err: unknown, fallback: string) {
  toast.error(err instanceof Error ? err.message : fallback)
}

export function KitchenMenuPage({ user, initialCategories, initialMenuItems, onLogout }: Props) {
  const [categories, setCategories] = useState(() => sortCategories(initialCategories))
  const [menuItems] = useState(initialMenuItems)
  const [, setCreateItemOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [, setEditingItem] = useState<AdminMenuItemView | null>(null)
  const [, setDeletingItem] = useState<AdminMenuItemView | null>(null)

  const onCreateCategory = useCallback(async (input: SaveCategoryInput) => {
    try {
      const category = await createCategory({ data: input })
      setCategories((prev) => sortCategories([...prev, category]))
      toast.success(`Đã thêm ${category.name}`)
    } catch (err) {
      toastApiError(err, 'Không thêm được danh mục')
      throw err
    }
  }, [])

  const onUpdateCategory = useCallback(async (input: { id: string } & SaveCategoryInput) => {
    try {
      const category = await updateCategory({ data: input })
      setCategories((prev) =>
        sortCategories(prev.map((current) => (current.id === category.id ? category : current))),
      )
      toast.success('Đã cập nhật danh mục')
    } catch (err) {
      toastApiError(err, 'Không cập nhật được danh mục')
      throw err
    }
  }, [])

  const onDeleteCategory = useCallback(async (id: string) => {
    try {
      await deleteCategory({ data: { id } })
      setCategories((prev) => prev.filter((category) => category.id !== id))
      toast.success('Đã xóa danh mục')
    } catch (err) {
      toastApiError(err, 'Không xóa được danh mục')
      throw err
    }
  }, [])

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

        <section
          aria-label="Quản lý thực đơn"
          className="rounded-panel border border-line-strong bg-white p-4 shadow-card"
        >
          <MenuAdminList
            categories={categories}
            menuItems={menuItems}
            onCreateItem={() => setCreateItemOpen(true)}
            onOpenCategories={() => setCategoriesOpen(true)}
            onEditItem={(item) => setEditingItem(item)}
            onDeleteItem={(item) => setDeletingItem(item)}
          />
        </section>
      </main>
      <CategoryAdminDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        onCreate={onCreateCategory}
        onUpdate={onUpdateCategory}
        onDelete={onDeleteCategory}
      />
      <Toaster />
    </div>
  )
}
