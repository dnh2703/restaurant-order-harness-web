import { useState, useEffect } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { TopNav } from '@/widgets/top-nav'
import { MenuGrid } from '@/widgets/menu-grid'
import { CartPanel } from '@/widgets/cart-panel'
import { DishDetailSheet } from '@/widgets/dish-detail'
import type { TableContext } from '@/entities/table'
import type { Menu, MenuItem } from '@/entities/menu'
import { defaultSelection, selectedOptions } from '@/entities/menu'
import { filterMenu } from '@/entities/menu'
import {
  type CartLine,
  buildCartLine,
  addLine,
  setQuantity,
  cartCount,
  quantityByMenuItem,
} from '@/entities/cart'
import { Drawer, DrawerContent, DrawerTitle, DrawerClose } from '@/shared/ui'
import { submitOrderItems } from '@/shared/api/order'

interface Props {
  context: TableContext
  menu: Menu
  search: { q: string; cat: string }
  onSearchChange: (next: Partial<{ q: string; cat: string }>) => void
  qrToken?: string
  onViewOrder?: () => void
  onSubmitted?: () => void
}

export function CustomerMenuPage({
  context,
  menu,
  search,
  onSearchChange,
  qrToken,
  onViewOrder,
  onSubmitted,
}: Props) {
  const { restaurant, table } = context
  const [cart, setCart] = useState<CartLine[]>([])
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const categories = menu.categories.map((c) => ({ id: c.id, name: c.name }))
  const filtered = filterMenu(menu, search)
  const quantities = quantityByMenuItem(cart)

  // Option-less dishes quick-add with their default (empty) selection.
  const onAdd = (item: MenuItem) =>
    setCart((c) =>
      addLine(c, buildCartLine(item, selectedOptions(item, defaultSelection(item)), null, 1)),
    )
  const onAddLine = (line: CartLine) => setCart((c) => addLine(c, line))
  const onSetQty = (lineId: string, qty: number) => setCart((c) => setQuantity(c, lineId, qty))

  const onSubmit = async () => {
    if (cart.length === 0 || !qrToken) return
    setSubmitting(true)
    setError(null)
    try {
      await submitOrderItems({
        data: {
          qrToken,
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            note: l.note,
            optionIds: l.options.map((o) => o.id),
          })),
        },
      })
      setCart([])
      setSheetOpen(false)
      setNotice('Đã gửi đơn tới bếp!')
      onSubmitted?.()
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
        cartCount={cartCount(cart)}
        onOpenCart={() => setSheetOpen(true)}
        onViewOrder={onViewOrder}
      />
      {notice && (
        <div className="bg-ok-bg px-4 py-2 text-center text-sm font-semibold text-ok-text">
          {notice}
        </div>
      )}

      <div className="mx-auto w-full max-w-[1360px] flex-1 lg:px-6 lg:py-6">
        <main className="px-4 py-5 lg:px-0">
          <MenuGrid
            menu={filtered}
            categories={categories}
            activeCat={search.cat}
            onSelectCat={(cat) => onSearchChange({ cat })}
            quantities={quantities}
            onAdd={onAdd}
            onOpenDetail={setDetailItem}
          />
        </main>
      </div>

      {/* Cart drawer (opens from the right, all breakpoints) */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen} direction="right">
        <DrawerContent>
          <DrawerTitle className="sr-only">Giỏ của bạn</DrawerTitle>
          <CartPanel
            {...cartProps}
            headerAction={
              <DrawerClose
                aria-label="Đóng giỏ hàng"
                className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-page"
              >
                <XIcon size={18} weight="bold" />
              </DrawerClose>
            }
          />
        </DrawerContent>
      </Drawer>

      <DishDetailSheet
        item={detailItem}
        open={detailItem !== null}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null)
        }}
        onAdd={onAddLine}
      />
    </div>
  )
}
