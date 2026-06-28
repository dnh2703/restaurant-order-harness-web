import type { Restaurant, TableInfo } from '@/entities/table/model'

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
        <label className="flex h-10 flex-1 items-center gap-2 rounded-[11px] bg-page px-3.5 sm:w-72">
          <span aria-hidden className="text-muted">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Tìm món…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
        <span className="flex h-10 shrink-0 items-center gap-2 rounded-[11px] border border-brand-border bg-brand-bg px-3.5 text-xs font-bold uppercase text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          {table.name}
        </span>
      </div>
    </header>
  )
}
