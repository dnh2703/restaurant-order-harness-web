import type { ReactNode } from 'react'
import { MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { type CartLine, cartCount, cartSubtotal } from '@/entities/cart'
import { formatVND } from '@/shared/lib/format'
import { Badge, Button } from '@/shared/ui'

interface Props {
  cart: CartLine[]
  onSetQty: (lineId: string, qty: number) => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
  /** Optional action rendered in the header (e.g. drawer close button). */
  headerAction?: ReactNode
}

export function CartPanel({ cart, onSetQty, onSubmit, submitting, error, headerAction }: Props) {
  const count = cartCount(cart)
  const subtotal = cartSubtotal(cart)
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <div className="text-lg font-extrabold text-ink">Giỏ của bạn</div>
        <div className="flex items-center gap-2">
          <Badge>{count} món</Badge>
          {headerAction}
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm text-muted">
          Giỏ hàng trống. Chọn món để bắt đầu.
        </div>
      ) : (
        <>
          <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-4">
            {cart.map((line) => (
              <div
                key={line.lineId}
                className="flex items-center gap-3 border-b border-line py-4 last:border-0"
              >
                <div className="size-13 shrink-0 rounded-[12px] bg-gradient-to-br from-line-strong to-[#c5cedd]">
                  {line.imageUrl && (
                    <img
                      src={line.imageUrl}
                      alt={line.name}
                      className="size-full rounded-[12px] object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink">{line.name}</div>
                  {line.options.length > 0 && (
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {line.options.map((o) => o.name).join(', ')}
                    </div>
                  )}
                  {line.note && (
                    <div className="mt-0.5 truncate text-xs text-muted">{line.note}</div>
                  )}
                  <div className="mt-0.5 text-xs font-semibold text-muted">
                    {formatVND(line.unitPrice)}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label={`Giảm ${line.name}`}
                    onClick={() => onSetQty(line.lineId, line.quantity - 1)}
                    className="flex size-6.5 items-center justify-center rounded-lg bg-page text-ink"
                  >
                    <MinusIcon size={14} weight="bold" />
                  </button>
                  <span className="text-sm font-bold text-ink">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Tăng ${line.name}`}
                    onClick={() => onSetQty(line.lineId, line.quantity + 1)}
                    className="flex size-6.5 items-center justify-center rounded-lg bg-ink text-white"
                  >
                    <PlusIcon size={14} weight="bold" />
                  </button>
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-[12px] border border-dashed border-line-strong px-3.5 py-3 opacity-60">
              <input
                disabled
                placeholder="Nhập mã giảm giá"
                className="bg-transparent text-sm text-muted outline-none"
              />
              <span className="text-sm font-bold text-brand">Áp dụng</span>
            </div>
          </div>

          <div className="border-t border-line px-6 py-5">
            <div className="flex justify-between pb-2 text-sm">
              <span className="text-muted">Tạm tính</span>
              <span className="font-semibold text-ink">{formatVND(subtotal)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-bold text-ink">Tổng cộng</span>
              <span className="text-xl font-extrabold text-ink">{formatVND(subtotal)}</span>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <Button size="lg" fullWidth onClick={onSubmit} disabled={submitting} className="mt-4">
              {submitting ? 'Đang gửi…' : `Gửi bếp · ${formatVND(subtotal)}`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
