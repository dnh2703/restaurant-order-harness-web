import { Plus } from '@phosphor-icons/react'

import type { Menu, MenuItem } from '@/entities/menu/model'
import { countItems } from '@/entities/menu/filter'
import { formatVND } from '@/shared/lib/format'
import { Chip } from '@/shared/ui'

interface Props {
  menu: Menu
  categories: { id: string; name: string }[]
  activeCat: string
  onSelectCat: (cat: string) => void
  quantities: Record<string, number>
  onAdd: (item: MenuItem) => void
  onOpenDetail: (item: MenuItem) => void
}

function DishCard({
  item,
  qty,
  onAdd,
  onOpenDetail,
}: {
  item: MenuItem
  qty: number
  onAdd: (i: MenuItem) => void
  onOpenDetail: (i: MenuItem) => void
}) {
  const soldOut = !item.isAvailable
  const hasOptions = item.optionGroups.length > 0
  const onPlus = () => (hasOptions ? onOpenDetail(item) : onAdd(item))
  return (
    <div
      data-dish={item.id}
      className={
        'overflow-hidden rounded-card bg-white shadow-card ' + (soldOut ? 'opacity-50' : '')
      }
    >
      <div className="relative h-[150px] bg-gradient-to-br from-line-strong to-[#c5cedd]">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-secondary">
            Hết hàng
          </span>
        )}
      </div>
      <div className="p-4">
        {hasOptions ? (
          <button
            type="button"
            aria-label={`Xem ${item.name}`}
            disabled={soldOut}
            onClick={() => onOpenDetail(item)}
            className="block w-full text-left"
          >
            <div className="font-bold text-ink">{item.name}</div>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
            )}
          </button>
        ) : (
          <>
            <div className="font-bold text-ink">{item.name}</div>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted">{item.description}</p>
            )}
          </>
        )}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="text-base font-extrabold text-ink">{formatVND(item.price)}</div>
          <div className="relative">
            <button
              type="button"
              aria-label={`${hasOptions ? 'Chọn' : 'Thêm'} ${item.name}`}
              disabled={soldOut}
              onClick={onPlus}
              className="flex size-9 items-center justify-center rounded-control bg-ink text-white disabled:opacity-40"
            >
              <Plus size={18} weight="bold" />
            </button>
            {qty > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-brand px-1 text-[10px] font-bold text-white">
                {qty}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MenuGrid({
  menu,
  categories,
  activeCat,
  onSelectCat,
  quantities,
  onAdd,
  onOpenDetail,
}: Props) {
  const activeName =
    activeCat === 'all' ? 'Tất cả' : (categories.find((c) => c.id === activeCat)?.name ?? 'Tất cả')
  const total = countItems(menu)
  return (
    <div>
      <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
        <Chip active={activeCat === 'all'} onClick={() => onSelectCat('all')}>
          Tất cả
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={activeCat === c.id} onClick={() => onSelectCat(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>
      <div className="mt-7 flex items-baseline justify-between">
        <div className="text-lg font-extrabold text-ink">{activeName}</div>
        <div className="text-xs text-muted">{total} món</div>
      </div>
      {total === 0 ? (
        <p className="py-12 text-center text-muted">Không tìm thấy món phù hợp.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {menu.categories.map((cat) => (
            <section key={cat.id}>
              {activeCat === 'all' && (
                <h2 className="mb-3 text-base font-bold text-ink">{cat.name}</h2>
              )}
              <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    qty={quantities[item.id] ?? 0}
                    onAdd={onAdd}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
