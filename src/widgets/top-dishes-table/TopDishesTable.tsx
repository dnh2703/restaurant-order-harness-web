import { DataTable, type DataTableColumn } from '@/shared/ui'
import { formatVND } from '@/shared/lib/format'
import type { TopDish } from '@/shared/api/types/reports'

type RankedDish = TopDish & { rank: number }

const columns: Array<DataTableColumn<RankedDish>> = [
  { id: 'rank', header: '#', cell: (r) => r.rank, headerClassName: 'w-12' },
  { id: 'name', header: 'Món', cell: (r) => r.name },
  { id: 'qty', header: 'Số lượng bán', cell: (r) => r.quantitySold },
  { id: 'revenue', header: 'Doanh thu', cell: (r) => formatVND(r.revenue) },
]

interface Props {
  dishes: TopDish[]
}

export function TopDishesTable({ dishes }: Props) {
  const rows: RankedDish[] = dishes.map((d, i) => ({ ...d, rank: i + 1 }))
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(r) => r.menuItemId}
      emptyMessage="Chưa có dữ liệu bán hàng trong khoảng này."
    />
  )
}
