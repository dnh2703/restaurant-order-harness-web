import { useState, useEffect } from 'react'
import type { TableContext } from '@/entities/table/model'
import type { Menu, MenuItem } from '@/entities/menu/model'
import { filterMenu } from '@/entities/menu/filter'
import { type CartLine, addItem, setQuantity, cartCount } from '@/entities/cart/model'
import { TopNav } from '@/widgets/top-nav/TopNav'
import { MenuGrid } from '@/widgets/menu-grid/MenuGrid'
import { CartPanel } from '@/widgets/cart-panel/CartPanel'
import { submitOrderItems } from '@/shared/api/order'

interface Props {
  context: TableContext
  menu: Menu
  search: { q: string; cat: string }
  onSearchChange: (next: Partial<{ q: string; cat: string }>) => void
  qrToken?: string
}

export function CustomerMenuPage({ context, menu, search, onSearchChange, qrToken }: Props) {
  const { restaurant, table } = context
  const [cart, setCart] = useState<CartLine[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const categories = menu.categories.map((c) => ({ id: c.id, name: c.name }))
  const filtered = filterMenu(menu, search)
  const quantities = Object.fromEntries(cart.map((l) => [l.id, l.quantity]))

  const onAdd = (item: MenuItem) => setCart((c) => addItem(c, item))
  const onSetQty = (id: string, qty: number) => setCart((c) => setQuantity(c, id, qty))

  const onSubmit = async () => {
    if (cart.length === 0 || !qrToken) return
    setSubmitting(true)
    setError(null)
    try {
      await submitOrderItems({
        data: { qrToken, items: cart.map((l) => ({ menuItemId: l.id, quantity: l.quantity })) },
      })
      setCart([])
      setSheetOpen(false)
      setNotice('Đã gửi đơn tới bếp!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi đơn thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(id)
  }, [notice])

  const cartProps = { cart, onSetQty, onSubmit, submitting, error }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        restaurant={restaurant}
        table={table}
        query={search.q}
        onQueryChange={(q) => onSearchChange({ q })}
      />
      {notice && (
        <div className="bg-ok-bg px-4 py-2 text-center text-sm font-semibold text-ok-text">
          {notice}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1360px] flex-1 gap-0 lg:gap-6 lg:px-6 lg:py-6">
        <main className="flex-1 px-4 py-5 pb-28 lg:px-0 lg:pb-0">
          <MenuGrid
            menu={filtered}
            categories={categories}
            activeCat={search.cat}
            onSelectCat={(cat) => onSearchChange({ cat })}
            quantities={quantities}
            onAdd={onAdd}
          />
        </main>

        {/* Desktop cart */}
        <aside className="hidden w-[360px] shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden rounded-card border border-line-strong shadow-panel">
            <CartPanel {...cartProps} />
          </div>
        </aside>
      </div>

      {/* Mobile cart bottom bar */}
      {cartCount(cart) > 0 && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between bg-ink px-5 py-4 text-white lg:hidden"
        >
          <span className="font-semibold">{cartCount(cart)} món · Xem giỏ</span>
          <span className="font-extrabold">Giỏ của bạn</span>
        </button>
      )}

      {/* Mobile cart sheet */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40 lg:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="max-h-[85vh] overflow-hidden rounded-t-card bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <CartPanel {...cartProps} />
          </div>
        </div>
      )}
    </div>
  )
}
