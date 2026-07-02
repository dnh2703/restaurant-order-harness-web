import { useCallback, useState } from 'react'
import { KitchenTableList } from '@/widgets/kitchen-table-list'
import { SideNav } from '@/widgets/side-nav'
import { TableQrSheet } from '@/widgets/table-qr-sheet'
import type { StaffUser } from '@/entities/staff'
import type { AdminTableView } from '@/shared/api/types/admin-table'
import { createTable, deleteTable, regenerateTableQr, updateTable } from '@/shared/api/tables'
import { Button, Toaster, toast } from '@/shared/ui'

interface Props {
  user: StaffUser
  initialTables: AdminTableView[]
  onLogout: () => void
}

function toastApiError(err: unknown, fallback: string) {
  toast.error(err instanceof Error ? err.message : fallback)
}

export function KitchenTablesPage({ user, initialTables, onLogout }: Props) {
  const [tables, setTables] = useState(initialTables)
  const [qrTable, setQrTable] = useState<AdminTableView | null>(null)
  const [qrOpen, setQrOpen] = useState(false)

  const openQr = useCallback((table: AdminTableView) => {
    setQrTable(table)
    setQrOpen(true)
  }, [])

  const onCreate = useCallback(async (input: { name: string; capacity?: number | null }) => {
    try {
      const table = await createTable({ data: input })
      setTables((prev) => [...prev, table].sort((a, b) => a.name.localeCompare(b.name, 'vi')))
      toast.success(`Đã thêm ${table.name}`)
    } catch (err) {
      toastApiError(err, 'Không thêm được bàn')
      throw err
    }
  }, [])

  const onUpdate = useCallback(
    async (input: { id: string; name: string; capacity?: number | null }) => {
      try {
        const table = await updateTable({ data: input })
        setTables((prev) =>
          prev
            .map((t) => (t.id === table.id ? table : t))
            .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
        )
        setQrTable((current) => (current?.id === table.id ? table : current))
        toast.success('Đã cập nhật bàn')
      } catch (err) {
        toastApiError(err, 'Không cập nhật được bàn')
        throw err
      }
    },
    [],
  )

  const onDelete = useCallback(async (id: string) => {
    try {
      await deleteTable({ data: { id } })
      setTables((prev) => prev.filter((t) => t.id !== id))
      setQrTable((current) => {
        if (current?.id === id) {
          setQrOpen(false)
          return null
        }
        return current
      })
      toast.success('Đã xóa bàn')
    } catch (err) {
      toastApiError(err, 'Không xóa được bàn')
      throw err
    }
  }, [])

  const onRegenerate = useCallback(async (id: string) => {
    const table = await regenerateTableQr({ data: { id } })
    return table
  }, [])

  const onRegenerated = useCallback((table: AdminTableView) => {
    setTables((prev) => prev.map((t) => (t.id === table.id ? table : t)))
    setQrTable(table)
    toast.success('Đã tạo mã QR mới')
  }, [])

  return (
    <div className="flex min-h-screen bg-page">
      <SideNav
        userName={user.name}
        userRole={user.role}
        onLogout={onLogout}
        activeSection="tables"
      />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink">Bàn ăn</h1>
            <p className="text-sm text-muted">Quản lý bàn và mã QR cho khách quét thực đơn.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onLogout} className="md:hidden">
            Đăng xuất
          </Button>
        </header>

        <KitchenTableList
          tables={tables}
          onCreate={onCreate}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onOpenQr={openQr}
        />
      </main>

      <TableQrSheet
        table={qrTable}
        open={qrOpen}
        onOpenChange={setQrOpen}
        onRegenerate={onRegenerate}
        onRegenerated={onRegenerated}
      />
      <Toaster />
    </div>
  )
}
