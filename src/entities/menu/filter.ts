import { matchesQuery } from '@/shared/lib/diacritics'
import type { Menu } from './model'

export function countItems(menu: Menu): number {
  return menu.categories.reduce((n, c) => n + c.items.length, 0)
}

export function filterMenu(menu: Menu, opts: { q: string; cat: string }): Menu {
  const categories = menu.categories
    .filter((c) => opts.cat === 'all' || c.id === opts.cat)
    .map((c) => ({ ...c, items: c.items.filter((i) => matchesQuery(i.name, opts.q)) }))
    .filter((c) => c.items.length > 0)
  return { categories }
}
