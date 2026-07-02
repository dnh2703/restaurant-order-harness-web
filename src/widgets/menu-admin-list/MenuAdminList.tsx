import { useEffect, useMemo, useState } from 'react'
import type { AdminCategoryView, AdminMenuItemView } from '@/shared/api/menu-admin'
import { matchesQuery } from '@/shared/lib/diacritics'
import { formatVND } from '@/shared/lib/format'
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select,
  type DataTableColumn,
} from '@/shared/ui'

const MENU_ADMIN_PAGE_SIZE = 10
const ALL_CATEGORIES = 'all'

interface Props {
  categories: AdminCategoryView[]
  menuItems: AdminMenuItemView[]
  onCreateItem: () => void
  onEditItem: (item: AdminMenuItemView) => void
  onDeleteItem: (item: AdminMenuItemView) => void
  onOpenCategories: () => void
}

function sortCategories(categories: AdminCategoryView[]) {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'),
  )
}

function getCategoryName(categories: AdminCategoryView[], categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? 'Chưa phân loại'
}

function createMenuAdminColumns({
  categories,
  onEditItem,
  onDeleteItem,
}: {
  categories: AdminCategoryView[]
  onEditItem: (item: AdminMenuItemView) => void
  onDeleteItem: (item: AdminMenuItemView) => void
}): Array<DataTableColumn<AdminMenuItemView>> {
  return [
    {
      id: 'name',
      header: 'Món',
      className: 'font-semibold text-ink',
      cell: (item) => item.name,
    },
    {
      id: 'category',
      header: 'Danh mục',
      className: 'text-muted',
      cell: (item) => getCategoryName(categories, item.categoryId),
    },
    {
      id: 'price',
      header: 'Giá',
      className: 'font-semibold text-ink',
      cell: (item) => formatVND(item.price),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: (item) => (
        <Badge variant={item.isAvailable ? 'brand' : 'outline'}>
          {item.isAvailable ? 'Còn món' : 'Hết món'}
        </Badge>
      ),
    },
    {
      id: 'options',
      header: 'Tùy chọn',
      className: 'text-muted',
      cell: () => '—',
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: (item) => (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => onEditItem(item)}>
            Sửa
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => onDeleteItem(item)}
          >
            Xóa
          </Button>
        </div>
      ),
    },
  ]
}

export function MenuAdminList({
  categories,
  menuItems,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onOpenCategories,
}: Props) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(MENU_ADMIN_PAGE_SIZE)
  const sortedCategories = useMemo(() => sortCategories(categories), [categories])
  const columns = createMenuAdminColumns({ categories, onEditItem, onDeleteItem })

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = categoryId === ALL_CATEGORIES || item.categoryId === categoryId
    return matchesCategory && matchesQuery(item.name, search)
  })
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const hasFilter = search.trim().length > 0 || categoryId !== ALL_CATEGORIES

  useEffect(() => {
    setPage(1)
  }, [search, categoryId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm món..."
            aria-label="Tìm món"
            containerClassName="h-11 w-full border border-line-strong bg-white px-4 shadow-card sm:w-72"
          />
          <Select
            value={categoryId}
            onValueChange={setCategoryId}
            ariaLabel="Danh mục"
            className="w-full sm:w-56"
            options={[
              { value: ALL_CATEGORIES, label: 'Tất cả' },
              ...sortedCategories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onOpenCategories} className="h-11">
            Danh mục
          </Button>
          <Button type="button" onClick={onCreateItem} className="h-11">
            Thêm món
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paginatedItems}
        getRowKey={(item) => item.id}
        emptyMessage={
          hasFilter ? 'Không tìm thấy món phù hợp.' : 'Chưa có món nào. Thêm món đầu tiên ở trên.'
        }
      />
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        pageSize={pageSize}
        totalItems={filteredItems.length}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize)
          setPage(1)
        }}
      />
    </div>
  )
}
