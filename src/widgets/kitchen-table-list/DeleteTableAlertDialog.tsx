import { useState } from 'react'
import type { AdminTableView } from '@/shared/api/types/admin-table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@/shared/ui'

interface Props {
  table: AdminTableView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (id: string) => Promise<void>
}

export function DeleteTableAlertDialog({ table, open, onOpenChange, onConfirm }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    if (!table) return
    setBusy(true)
    try {
      await onConfirm(table.id)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  if (!table) return null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa {table.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Bàn sẽ bị xóa vĩnh viễn khỏi nhà hàng.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Đang xóa…' : 'Xóa bàn'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
