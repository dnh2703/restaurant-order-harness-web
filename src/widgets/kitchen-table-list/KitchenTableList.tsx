import { useState } from 'react'
import type { AdminTableView } from '@/shared/api/types/admin-table'
import { TABLE_STATUS_LABEL } from '@/shared/api/tables-normalize'
import { Badge, Button, DataTable, Input, type DataTableColumn } from '@/shared/ui'
import { CreateTableDialog } from './CreateTableForm'
import { DeleteTableAlertDialog } from './DeleteTableAlertDialog'
import { EditTableModal } from './EditTableModal'

interface Props {
  tables: AdminTableView[]
  onCreate: (input: { name: string; capacity?: number | null }) => Promise<void>
  onUpdate: (input: { id: string; name: string; capacity?: number | null }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onOpenQr: (table: AdminTableView) => void
}

function createKitchenTableColumns({
  onEdit,
  onDelete,
  onOpenQr,
}: {
  onEdit: (table: AdminTableView) => void
  onDelete: (table: AdminTableView) => void
  onOpenQr: (table: AdminTableView) => void
}): Array<DataTableColumn<AdminTableView>> {
  return [
    {
      id: 'name',
      header: 'Tên bàn',
      className: 'font-semibold text-ink',
      cell: (table) => table.name,
    },
    {
      id: 'capacity',
      header: 'Sức chứa',
      className: 'text-muted',
      cell: (table) => table.capacity ?? '—',
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (table) => (
        <Badge variant={table.status === 'OCCUPIED' ? 'brand' : 'outline'}>
          {TABLE_STATUS_LABEL[table.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: (table) => (
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
      ),
    },
  ]
}

export function KitchenTableList({ tables, onCreate, onUpdate, onDelete, onOpenQr }: Props) {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
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

  const columns = createKitchenTableColumns({
    onEdit: openEdit,
    onDelete: openDelete,
    onOpenQr,
  })
  const searchQuery = search.trim().toLocaleLowerCase('vi')
  const filteredTables =
    searchQuery.length === 0
      ? tables
      : tables.filter((table) => table.name.toLocaleLowerCase('vi').includes(searchQuery))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bàn..."
          aria-label="Tìm bàn"
          containerClassName="h-11 w-full border border-line-strong bg-white px-4 shadow-card sm:max-w-sm"
        />
        <Button type="button" onClick={() => setCreateOpen(true)} className="h-11 shrink-0">
          Thêm bàn ăn
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredTables}
        getRowKey={(table) => table.id}
        emptyMessage={
          searchQuery.length > 0
            ? 'Không tìm thấy bàn phù hợp.'
            : 'Chưa có bàn nào. Thêm bàn đầu tiên ở trên.'
        }
      />

      <CreateTableDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={onCreate} />

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
