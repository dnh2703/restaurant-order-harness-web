import { useEffect, useMemo, useState } from 'react'
import type { AdminCategoryView, SaveCategoryInput } from '@/shared/api/menu-admin'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  type DataTableColumn,
} from '@/shared/ui'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: AdminCategoryView[]
  onCreate: (input: SaveCategoryInput) => Promise<void>
  onUpdate: (input: { id: string } & SaveCategoryInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const fieldClass =
  'h-10 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

function sortCategories(categories: AdminCategoryView[]) {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'),
  )
}

function parseSortOrder(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

function createCategoryColumns({
  disabled,
  onEdit,
  onDelete,
}: {
  disabled: boolean
  onEdit: (category: AdminCategoryView) => void
  onDelete: (category: AdminCategoryView) => void
}): Array<DataTableColumn<AdminCategoryView>> {
  return [
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onEdit(category)}
            disabled={disabled}
          >
            Sửa
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => onDelete(category)}
            disabled={disabled}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ]
}

function resetDraftState({
  setNewName,
  setNewSortOrder,
  setEditing,
  setEditName,
  setEditSortOrder,
  setDeleting,
}: {
  setNewName: (value: string) => void
  setNewSortOrder: (value: string) => void
  setEditing: (value: AdminCategoryView | null) => void
  setEditName: (value: string) => void
  setEditSortOrder: (value: string) => void
  setDeleting: (value: AdminCategoryView | null) => void
}) {
  setNewName('')
  setNewSortOrder('')
  setEditing(null)
  setEditName('')
  setEditSortOrder('')
  setDeleting(null)
}

export function CategoryAdminDialog({
  open,
  onOpenChange,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const sortedCategories = useMemo(() => sortCategories(categories), [categories])
  const [newName, setNewName] = useState('')
  const [newSortOrder, setNewSortOrder] = useState('')
  const [editing, setEditing] = useState<AdminCategoryView | null>(null)
  const [editName, setEditName] = useState('')
  const [editSortOrder, setEditSortOrder] = useState('')
  const [deleting, setDeleting] = useState<AdminCategoryView | null>(null)
  const [busy, setBusy] = useState<'create' | 'update' | 'delete' | null>(null)

  useEffect(() => {
    if (!editing) return
    setEditName(editing.name)
    setEditSortOrder(String(editing.sortOrder))
  }, [editing])

  const isBusy = busy !== null
  const resetState = () =>
    resetDraftState({
      setNewName,
      setNewSortOrder,
      setEditing,
      setEditName,
      setEditSortOrder,
      setDeleting,
    })

  useEffect(() => {
    if (!open) resetState()
  }, [open])

  const columns = useMemo(
    () =>
      createCategoryColumns({
        disabled: isBusy,
        onEdit: setEditing,
        onDelete: setDeleting,
      }),
    [isBusy],
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (isBusy) return
    const name = newName.trim()
    if (!name) return

    setBusy('create')
    try {
      await onCreate({ name, sortOrder: parseSortOrder(newSortOrder) })
      setNewName('')
      setNewSortOrder('')
    } catch {
      // Parent handlers own the toast; keep the draft visible for correction.
    } finally {
      setBusy(null)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || isBusy) return
    const name = editName.trim()
    if (!name) return

    setBusy('update')
    try {
      await onUpdate({ id: editing.id, name, sortOrder: parseSortOrder(editSortOrder) })
      setEditing(null)
    } catch {
      // Parent handlers own the toast; keep the edit form open for correction.
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!deleting || isBusy) return

    setBusy('delete')
    try {
      await onDelete(deleting.id)
      setDeleting(null)
      setEditing((current) => (current?.id === deleting.id ? null : current))
    } catch {
      // Parent handlers own the toast; keep confirmation state for retry/cancel.
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isBusy) onOpenChange(next)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quản lý danh mục</DialogTitle>
            <DialogDescription>Tạo, sửa hoặc xóa danh mục món ăn.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="new-category-name" className="text-sm font-semibold text-ink-soft">
                Tên danh mục mới
              </label>
              <Input
                id="new-category-name"
                name="newCategoryName"
                autoComplete="off"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Tráng miệng"
                containerClassName={fieldClass}
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-category-sort" className="text-sm font-semibold text-ink-soft">
                Thứ tự mới
              </label>
              <Input
                id="new-category-sort"
                name="newCategorySortOrder"
                autoComplete="off"
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value)}
                placeholder="3"
                containerClassName={fieldClass}
                disabled={isBusy}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="h-10 w-full sm:w-auto"
                disabled={isBusy || !newName.trim()}
              >
                {busy === 'create' ? 'Đang thêm…' : 'Thêm danh mục'}
              </Button>
            </div>
          </form>

          {editing ? (
            <form
              onSubmit={handleUpdate}
              className="grid gap-3 rounded-card border border-line-strong bg-page p-3 sm:grid-cols-[1fr_8rem_auto_auto]"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="edit-category-name" className="text-sm font-semibold text-ink-soft">
                  Tên danh mục
                </label>
                <Input
                  id="edit-category-name"
                  name="editCategoryName"
                  autoComplete="off"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  containerClassName={fieldClass}
                  disabled={isBusy}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-category-sort" className="text-sm font-semibold text-ink-soft">
                  Thứ tự
                </label>
                <Input
                  id="edit-category-sort"
                  name="editCategorySortOrder"
                  autoComplete="off"
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                  containerClassName={fieldClass}
                  disabled={isBusy}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="h-10 w-full sm:w-auto"
                  disabled={isBusy || !editName.trim()}
                >
                  {busy === 'update' ? 'Đang lưu…' : 'Lưu danh mục'}
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 w-full sm:w-auto"
                  onClick={() => setEditing(null)}
                  disabled={isBusy}
                >
                  Hủy
                </Button>
              </div>
            </form>
          ) : null}

          <DataTable
            columns={columns}
            data={sortedCategories}
            getRowKey={(category) => category.id}
            emptyMessage="Chưa có danh mục nào."
            tableClassName="min-w-[520px]"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next && !isBusy) setDeleting(null)
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
            <AlertDialogCancel disabled={isBusy}>Hủy</AlertDialogCancel>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {busy === 'delete' ? 'Đang xóa…' : 'Xóa danh mục'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
