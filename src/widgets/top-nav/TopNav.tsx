import { MagnifyingGlass, ShoppingCart, Receipt } from '@phosphor-icons/react'

import type { Restaurant, TableInfo } from '@/entities/table/model'
import { Badge, Input } from '@/shared/ui'

interface Props {
  restaurant: Restaurant
  table: TableInfo
  query: string
  onQueryChange: (q: string) => void
  cartCount: number
  onOpenCart: () => void
  onViewOrder?: () => void
}

export function TopNav({
  restaurant,
  table,
  query,
  onQueryChange,
  cartCount,
  onOpenCart,
  onViewOrder,
}: Props) {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex items-center gap-3.5">
        <div className="flex size-10 items-center justify-center rounded-[12px] bg-ink text-lg font-extrabold text-white">
          {restaurant.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-lg font-extrabold leading-none tracking-tight text-ink">
          {restaurant.name}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Input
          type="search"
          aria-label="Tìm món"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Tìm món…"
          leadingIcon={<MagnifyingGlass size={18} weight="bold" />}
          containerClassName="h-10 flex-1 sm:w-72"
        />
        <Badge variant="outline" size="md" dot className="shrink-0 uppercase">
          {table.name}
        </Badge>
        {onViewOrder && (
          <button
            type="button"
            onClick={onViewOrder}
            aria-label="Xem đơn của bạn"
            className="flex size-10 shrink-0 items-center justify-center rounded-control border border-line-strong bg-white text-ink transition-colors hover:bg-page"
          >
            <Receipt size={20} weight="regular" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenCart}
          aria-label={cartCount > 0 ? `Mở giỏ hàng, ${cartCount} món` : 'Mở giỏ hàng'}
          className="relative flex size-10 shrink-0 items-center justify-center rounded-control border border-line-strong bg-white text-ink transition-colors hover:bg-page"
        >
          <ShoppingCart size={20} weight="regular" />
          {cartCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-extrabold leading-none text-white">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
