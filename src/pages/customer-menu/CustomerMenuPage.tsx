import type { TableContext } from '@/entities/table/model'
import type { Menu } from '@/entities/menu/model'
import { MenuList } from '@/widgets/menu-list/MenuList'

interface Props {
  context: TableContext
  menu: Menu
}

export function CustomerMenuPage({ context, menu }: Props) {
  const { restaurant, table } = context
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
        <p className="text-lg font-semibold leading-tight">{restaurant.name}</p>
        <p className="text-sm text-neutral-500">{table.name} · Phiên đang mở</p>
      </header>
      <main className="flex-1 px-4 py-5">
        <MenuList menu={menu} />
      </main>
    </div>
  )
}
