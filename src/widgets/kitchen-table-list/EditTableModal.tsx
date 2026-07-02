import { useEffect, useState } from 'react'
import type { AdminTableView } from '@/shared/api/types/admin-table'
import { TABLE_STATUS_LABEL } from '@/shared/api/tables-normalize'
import {
  Badge,
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
  table: AdminTableView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: { id: string; name: string; capacity?: number | null }) => Promise<void>
}

const fieldClass =
  'h-11 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

export function EditTableModal({ table, open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (table && open) {
      setName(table.name)
      setCapacity(table.capacity?.toString() ?? '')
    }
  }, [table, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!table) return
    const trimmed = name.trim()
    if (!trimmed) return
    const cap = capacity.trim() === '' ? null : Number(capacity)
    if (cap !== null && (Number.isNaN(cap) || cap < 1)) return

    setBusy(true)
    try {
      await onSave({ id: table.id, name: trimmed, capacity: cap })
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  if (!table) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa bàn</DialogTitle>
          <DialogDescription>Cập nhật tên và sức chứa của bàn.</DialogDescription>
        </DialogHeader>

        <form id="edit-table-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-table-name" className="text-sm font-semibold text-ink-soft">
              Tên bàn
            </label>
            <Input
              id="edit-table-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bàn 10"
              containerClassName={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-table-capacity" className="text-sm font-semibold text-ink-soft">
              Sức chứa
            </label>
            <Input
              id="edit-table-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="4"
              containerClassName={fieldClass}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-soft">Trạng thái</span>
            <Badge variant={table.status === 'OCCUPIED' ? 'brand' : 'outline'}>
              {TABLE_STATUS_LABEL[table.status]}
            </Badge>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Hủy
          </Button>
          <Button type="submit" form="edit-table-form" disabled={busy || !name.trim()}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
