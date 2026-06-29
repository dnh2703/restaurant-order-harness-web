import type { Restaurant, TableInfo } from '@/entities/table/model'
import { Badge, Input } from '@/shared/ui'

interface Props {
  restaurant: Restaurant
  table: TableInfo
  query: string
  onQueryChange: (q: string) => void
}

export function TopNav({ restaurant, table, query, onQueryChange }: Props) {
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
          leadingIcon="⌕"
          containerClassName="h-10 flex-1 sm:w-72"
        />
        <Badge variant="outline" size="md" dot className="shrink-0 uppercase">
          {table.name}
        </Badge>
      </div>
    </header>
  )
}
