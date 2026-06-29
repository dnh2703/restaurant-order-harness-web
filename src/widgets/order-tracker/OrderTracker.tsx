// src/widgets/order-tracker/OrderTracker.tsx
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { formatVND } from '@/shared/lib/format'
import type { Order } from '@/entities/order/model'
import type { StreamMode } from '@/entities/order/useOrderStream'
import { OrderStatusChip } from './OrderStatusChip'

interface Props {
  order: Order
  mode: StreamMode
  /** e.g. a router Link back to the menu, rendered in the footer. */
  backLink?: ReactNode
}

export function OrderTracker({ order, mode, backLink }: Props) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <div className="text-lg font-extrabold text-ink">Đơn của bạn</div>
        <ConnectionDot mode={mode} />
      </div>

      {order.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm text-muted">
          <p>Chưa có món nào</p>
          {backLink}
        </div>
      ) : (
        <>
          <div className="scrollbar-none flex-1 overflow-y-auto px-6 py-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 border-b border-line py-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div
                    aria-label={`${item.quantity} ${item.nameSnapshot}`}
                    className={cn(
                      'truncate font-bold text-ink',
                      item.status === 'CANCELLED' && 'text-muted line-through',
                    )}
                  >
                    {item.quantity}× <span>{item.nameSnapshot}</span>
                  </div>
                  {item.options.length > 0 && (
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {item.options.map((o) => o.optionName).join(', ')}
                    </div>
                  )}
                  {item.note && (
                    <div className="mt-0.5 truncate text-xs text-muted">{item.note}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <OrderStatusChip status={item.status} />
                  <span className="text-xs font-semibold text-muted">
                    {formatVND(item.unitPrice * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-line px-6 py-5">
            <div className="flex justify-between pb-2 text-sm">
              <span className="text-muted">Tạm tính</span>
              <span className="font-semibold text-ink">{formatVND(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between pb-2 text-sm">
                <span className="text-muted">Giảm giá</span>
                <span className="font-semibold text-ink">−{formatVND(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <span className="font-bold text-ink">Tổng cộng</span>
              <span data-testid="order-total" className="text-xl font-extrabold text-ink">
                {formatVND(order.total)}
              </span>
            </div>
            {backLink && <div className="mt-4">{backLink}</div>}
          </div>
        </>
      )}
    </div>
  )
}

function ConnectionDot({ mode }: { mode: StreamMode }) {
  const live = mode === 'live'
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
      <span
        className={cn(
          'size-2 rounded-full',
          live ? 'bg-emerald-500' : 'bg-amber-500',
          live && 'animate-pulse',
        )}
      />
      {live ? 'Đang cập nhật trực tiếp' : 'Đang đồng bộ…'}
    </span>
  )
}
