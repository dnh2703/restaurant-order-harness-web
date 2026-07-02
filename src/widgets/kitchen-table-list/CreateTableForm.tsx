import { useState } from 'react'
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
  onCreate: (input: { name: string; capacity?: number | null }) => Promise<void>
}

const fieldClass =
  'h-10 border border-line-strong bg-white px-3 shadow-none focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'

export function CreateTableDialog({ open, onOpenChange, onCreate }: Props) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const cap = capacity.trim() === '' ? null : Number(capacity)
    if (cap !== null && (Number.isNaN(cap) || cap < 1)) return

    setBusy(true)
    try {
      await onCreate({ name: trimmed, capacity: cap })
      setName('')
      setCapacity('')
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm bàn ăn</DialogTitle>
          <DialogDescription>Tạo bàn mới để khách quét QR và gọi món.</DialogDescription>
        </DialogHeader>

        <form id="create-table-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="new-table-name" className="text-sm font-semibold text-ink-soft">
              Tên bàn
            </label>
            <Input
              id="new-table-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bàn 10"
              containerClassName={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-table-capacity" className="text-sm font-semibold text-ink-soft">
              Sức chứa
            </label>
            <Input
              id="new-table-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="4"
              containerClassName={fieldClass}
            />
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
          <Button type="submit" form="create-table-form" disabled={busy || !name.trim()}>
            {busy ? 'Đang thêm…' : 'Thêm bàn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
