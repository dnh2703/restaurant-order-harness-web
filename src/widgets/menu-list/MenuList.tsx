import type { Menu, MenuItem } from '@/entities/menu/model'
import { formatVND } from '@/shared/lib/format'

function MenuItemCard({ item }: { item: MenuItem }) {
  const soldOut = !item.isAvailable
  return (
    <li
      className={
        'flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm ' +
        (soldOut ? 'opacity-50' : '')
      }
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="size-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-400">
          No image
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-medium">{item.name}</h3>
          {soldOut && (
            <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
              Hết hàng
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{item.description}</p>
        )}
        <div className="mt-auto pt-2 font-semibold text-orange-600">{formatVND(item.price)}</div>
      </div>
    </li>
  )
}

export function MenuList({ menu }: { menu: Menu }) {
  if (menu.categories.length === 0) {
    return <p className="py-10 text-center text-neutral-500">Thực đơn đang được cập nhật.</p>
  }
  return (
    <div className="flex flex-col gap-8">
      {menu.categories.map((category) => (
        <section key={category.id}>
          <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
          <ul className="flex flex-col gap-3">
            {category.items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
