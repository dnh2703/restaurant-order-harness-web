import { useState } from 'react'
import type { AdminTableView } from '@/shared/api/types/admin-table'
import { TABLE_STATUS_LABEL } from '@/shared/api/tables-normalize'
import { Badge, Button } from '@/shared/ui'
import { CreateTableForm } from './CreateTableForm'
import { DeleteTableAlertDialog } from './DeleteTableAlertDialog'
import { EditTableModal } from './EditTableModal'

interface Props {
  tables: AdminTableView[]
  onCreate: (input: { name: string; capacity?: number | null }) => Promise<void>
  onUpdate: (input: { id: string; name: string; capacity?: number | null }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onOpenQr: (table: AdminTableView) => void
}

function TableRow({
  table,
  onEdit,
  onDelete,
  onOpenQr,
}: {
  table: AdminTableView
  onEdit: (table: AdminTableView) => void
  onDelete: (table: AdminTableView) => void
  onOpenQr: (table: AdminTableView) => void
}) {
  return (
    <tr className="border-t border-line">
      <td className="px-3 py-3 font-semibold text-ink">{table.name}</td>
      <td className="px-3 py-3 text-muted">{table.capacity ?? '—'}</td>
      <td className="px-3 py-3">
        <Badge variant={table.status === 'OCCUPIED' ? 'brand' : 'outline'}>
          {TABLE_STATUS_LABEL[table.status]}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenQr(table)}>
            Mã QR
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(table)}>
            Sửa
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(table)}>
            Xóa
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function KitchenTableList({ tables, onCreate, onUpdate, onDelete, onOpenQr }: Props) {
  const [editTable, setEditTable] = useState<AdminTableView | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteTable, setDeleteTable] = useState<AdminTableView | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function openEdit(table: AdminTableView) {
    setEditTable(table)
    setEditOpen(true)
  }

  function openDelete(table: AdminTableView) {
    setDeleteTable(table)
    setDeleteOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <CreateTableForm onCreate={onCreate} />

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-page text-xs font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3">Tên bàn</th>
              <th className="px-3 py-3">Sức chứa</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tables.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted">
                  Chưa có bàn nào. Thêm bàn đầu tiên ở trên.
                </td>
              </tr>
            ) : (
              tables.map((table) => (
                <TableRow
                  key={table.id}
                  table={table}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onOpenQr={onOpenQr}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditTableModal
        table={editTable}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={onUpdate}
      />

      <DeleteTableAlertDialog
        table={deleteTable}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={onDelete}
      />
    </div>
  )
}
