import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface DataTableColumn<TData> {
  id: string
  header: ReactNode
  cell: (row: TData) => ReactNode
  className?: string
  headerClassName?: string
}

interface Props<TData> {
  columns: Array<DataTableColumn<TData>>
  data: TData[]
  getRowKey: (row: TData, index: number) => string
  emptyMessage?: ReactNode
  className?: string
  tableClassName?: string
}

export function DataTable<TData>({
  columns,
  data,
  getRowKey,
  emptyMessage = 'Không có dữ liệu.',
  className,
  tableClassName,
}: Props<TData>) {
  return (
    <div
      data-slot="data-table"
      className={cn(
        'overflow-x-auto rounded-card border border-line-strong bg-white shadow-card',
        className,
      )}
    >
      <table className={cn('w-full min-w-[640px] text-left text-sm', tableClassName)}>
        <thead className="border-b border-line-strong bg-page text-xs font-extrabold uppercase tracking-wide">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn('px-5 py-4 text-secondary', column.headerClassName)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className="border-b border-line-strong transition-colors last:border-b-0 hover:bg-page"
              >
                {columns.map((column) => (
                  <td key={column.id} className={cn('px-5 py-4', column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
