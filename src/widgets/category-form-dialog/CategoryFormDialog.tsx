import { useEffect, useState } from 'react'
import type { AdminCategoryView, SaveCategoryInput } from '@/shared/api/menu-admin'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/ui'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: AdminCategoryView | null
  onSubmit: (input: SaveCategoryInput | ({ id: string } & SaveCategoryInput)) => Promise<void>
}

const fieldClass =
  'h-10 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

function parseSortOrder(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function CategoryFormDialog({ open, onOpenChange, category, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setSortOrder(category ? String(category.sortOrder) : '')
    setSaving(false)
  }, [category, open])

  const trimmedName = name.trim()
  const title = category ? 'Sửa danh mục' : 'Thêm danh mục'
  const submitLabel = category ? 'Lưu danh mục' : 'Thêm danh mục'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !trimmedName) return

    const fields: SaveCategoryInput = { name: trimmedName, sortOrder: parseSortOrder(sortOrder) }

    setSaving(true)
    try {
      await onSubmit(category ? { id: category.id, ...fields } : fields)
      onOpenChange(false)
    } catch {
      // Parent owns toast/error display; keep the draft open for correction.
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Nhập tên và thứ tự hiển thị của danh mục.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category-form-name" className="text-sm font-semibold text-ink-soft">
              Tên danh mục
            </label>
            <Input
              id="category-form-name"
              name="categoryName"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Món chính"
              containerClassName={fieldClass}
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category-form-sort" className="text-sm font-semibold text-ink-soft">
              Thứ tự
            </label>
            <Input
              id="category-form-sort"
              name="categorySortOrder"
              autoComplete="off"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="1"
              containerClassName={fieldClass}
              disabled={saving}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving || !trimmedName}>
              {saving ? 'Đang lưu…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
