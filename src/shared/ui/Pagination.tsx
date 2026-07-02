import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { cn } from '@/shared/lib/cn'
import { Button } from './Button'
import { Select } from './Select'

interface Props {
  page: number
  pageCount: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
}

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1))
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  totalItems: _totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
  className,
}: Props) {
  const safePageCount = Math.max(pageCount, 1)
  const safePage = clampPage(page, safePageCount)

  function goToPage(nextPage: number) {
    onPageChange(clampPage(nextPage, safePageCount))
  }

  return (
    <nav
      aria-label="Phân trang"
      data-slot="pagination"
      className={cn(
        'flex flex-col gap-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <label htmlFor="pagination-page-size" className="font-semibold">
          Số dòng mỗi trang
        </label>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange?.(Number(value))}
          options={pageSizeOptions.map((option) => ({
            value: option.toString(),
            label: option.toString(),
          }))}
          ariaLabel="Số dòng mỗi trang"
          triggerId="pagination-page-size"
          disabled={!onPageSizeChange}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="font-semibold sm:mx-8">{`Trang ${safePage} / ${safePageCount}`}</p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            aria-label="Trang đầu"
            disabled={safePage <= 1}
            onClick={() => goToPage(1)}
            className="flex size-11 items-center justify-center rounded-control p-0"
          >
            <CaretLeftIcon aria-hidden size={18} weight="bold" />
            <CaretLeftIcon aria-hidden size={18} weight="bold" className="-ml-3" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label="Trang trước"
            disabled={safePage <= 1}
            onClick={() => goToPage(safePage - 1)}
            className="flex size-11 items-center justify-center rounded-control p-0"
          >
            <CaretLeftIcon aria-hidden size={18} weight="bold" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label="Trang sau"
            disabled={safePage >= safePageCount}
            onClick={() => goToPage(safePage + 1)}
            className="flex size-11 items-center justify-center rounded-control p-0"
          >
            <CaretRightIcon aria-hidden size={18} weight="bold" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label="Trang cuối"
            disabled={safePage >= safePageCount}
            onClick={() => goToPage(safePageCount)}
            className="flex size-11 items-center justify-center rounded-control p-0"
          >
            <CaretRightIcon aria-hidden size={18} weight="bold" />
            <CaretRightIcon aria-hidden size={18} weight="bold" className="-ml-3" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
