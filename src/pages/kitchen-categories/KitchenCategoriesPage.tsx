import { useCallback, useMemo, useState } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { CategoryFormDialog } from '@/widgets/category-form-dialog'
import { SideNav } from '@/widgets/side-nav'
import type { StaffUser } from '@/entities/staff'
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type AdminCategoryView,
  type SaveCategoryInput,
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
  DataTable,
  Toaster,
  toast,
  type DataTableColumn,
} from '@/shared/ui'

interface Props {
  user: StaffUser
  initialCategories: AdminCategoryView[]
  onLogout: () => void
  onBack: () => void
  /** Called after any successful mutation so callers can revalidate cached data. */
  onChanged?: () => void
}

function sortCategories(categories: AdminCategoryView[]) {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'),
  )
}

function toastApiError(err: unknown, fallback: string) {
  toast.error(err instanceof Error ? err.message : fallback)
}

export function KitchenCategoriesPage({
  user,
  initialCategories,
  onLogout,
  onBack,
  onChanged,
}: Props) {
  const [categories, setCategories] = useState(() => sortCategories(initialCategories))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCategoryView | null>(null)
  const [deleting, setDeleting] = useState<AdminCategoryView | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const openCreate = useCallback(() => {
    setEditing(null)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((category: AdminCategoryView) => {
    setEditing(category)
    setFormOpen(true)
  }, [])

  const onSubmit = useCallback(
    async (input: SaveCategoryInput | ({ id: string } & SaveCategoryInput)) => {
      try {
        if ('id' in input) {
          const category = await updateCategory({ data: input })
          setCategories((prev) =>
            sortCategories(
              prev.map((current) => (current.id === category.id ? category : current)),
            ),
          )
          toast.success('Đã cập nhật danh mục')
          onChanged?.()
          return
        }

        const category = await createCategory({ data: input })
        setCategories((prev) => sortCategories([...prev, category]))
        toast.success(`Đã thêm ${category.name}`)
        onChanged?.()
      } catch (err) {
        toastApiError(err, 'Không lưu được danh mục')
        throw err
      }
    },
    [onChanged],
  )

  const onConfirmDelete = useCallback(async () => {
    if (!deleting || deletingBusy) return

    setDeletingBusy(true)
    try {
      await deleteCategory({ data: { id: deleting.id } })
      setCategories((prev) => prev.filter((category) => category.id !== deleting.id))
      toast.success('Đã xóa danh mục')
      setDeleting(null)
      onChanged?.()
    } catch (err) {
      toastApiError(err, 'Không xóa được danh mục')
    } finally {
      setDeletingBusy(false)
    }
  }, [deleting, deletingBusy, onChanged])

  const columns = useMemo<Array<DataTableColumn<AdminCategoryView>>>(
    () => [
      {
        id: 'name',
        header: 'Tên danh mục',
        className: 'font-semibold text-ink',
        cell: (category) => category.name,
      },
      {
        id: 'sortOrder',
        header: 'Thứ tự',
        className: 'text-muted',
        cell: (category) => category.sortOrder,
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: (category) => (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(category)}>
              Sửa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={() => setDeleting(category)}
            >
              Xóa
            </Button>
          </div>
        ),
      },
    ],
    [openEdit],
  )

  return (
    <div className="flex min-h-screen bg-page">
      <SideNav userName={user.name} userRole={user.role} onLogout={onLogout} activeSection="menu" />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onBack}
              className="-ml-2 w-fit gap-1 text-muted hover:text-ink"
            >
              <ArrowLeftIcon size={16} weight="bold" />
              Thực đơn
            </Button>
            <h1 className="text-xl font-extrabold text-ink">Danh mục</h1>
            <p className="text-sm text-muted">Quản lý danh mục món ăn của nhà hàng.</p>
          </div>
          <Button type="button" onClick={openCreate} className="h-11">
            Thêm danh mục
          </Button>
        </header>

        <section aria-label="Danh sách danh mục">
          <DataTable
            columns={columns}
            data={categories}
            getRowKey={(category) => category.id}
            emptyMessage="Chưa có danh mục nào. Thêm danh mục đầu tiên ở trên."
          />
        </section>
      </main>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        category={editing}
        onSubmit={onSubmit}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next && !deletingBusy) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Nếu danh mục đang có món, máy chủ sẽ từ chối xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Hủy</AlertDialogCancel>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onConfirmDelete}
              disabled={deletingBusy}
            >
              {deletingBusy ? 'Đang xóa…' : 'Xóa danh mục'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  )
}
