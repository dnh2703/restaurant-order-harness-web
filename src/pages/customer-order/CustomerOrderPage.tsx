// src/pages/customer-order/CustomerOrderPage.tsx
import type { ReactNode } from 'react'
import { useOrderStream } from '@/entities/order/useOrderStream'
import { OrderTracker } from '@/widgets/order-tracker/OrderTracker'
import { Button } from '@/shared/ui'

interface Props {
  qrToken: string
  /** Router Link back to the menu, forwarded to the tracker. */
  backLink?: ReactNode
}

export function CustomerOrderPage({ qrToken, backLink }: Props) {
  const { order, mode, refetch } = useOrderStream(qrToken)

  if (!order && mode === 'error') {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-bold text-ink">Không tải được đơn</h1>
        <p className="text-sm text-muted">Vui lòng thử lại sau giây lát.</p>
        <Button onClick={refetch}>Thử lại</Button>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 text-sm text-muted">
        Đang tải đơn…
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl">
      <OrderTracker order={order} mode={mode} backLink={backLink} />
    </main>
  )
}
