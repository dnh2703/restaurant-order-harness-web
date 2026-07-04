import type { BillDetail, PaymentMethod } from '@/entities/cashier'
import { formatVND } from '@/shared/lib/format'
import { Button } from '@/shared/ui'

interface Props {
  bill: BillDetail
  tableName: string
  method: PaymentMethod
  onClose: () => void
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
}

export function InvoiceReceipt({ bill, tableName, method, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-card">
        <div id="invoice-print" className="flex flex-col gap-3">
          <header className="text-center">
            <h2 className="text-lg font-bold text-ink">Hóa đơn</h2>
            <p className="text-sm text-muted">{tableName}</p>
          </header>
          <ul className="flex flex-col gap-1 border-y border-line py-2 text-sm">
            {bill.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span className="text-ink">
                  {item.nameSnapshot} ×{item.quantity}
                </span>
                <span className="text-ink">{formatVND(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Tạm tính</dt>
              <dd className="text-ink">{formatVND(bill.subtotal)}</dd>
            </div>
            {bill.discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Giảm giá</dt>
                <dd className="text-ink">−{formatVND(bill.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <dt className="text-ink">Tổng</dt>
              <dd className="text-brand">{formatVND(bill.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Thanh toán</dt>
              <dd className="text-ink">{METHOD_LABEL[method]}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Đóng
          </Button>
          <Button type="button" fullWidth onClick={() => window.print()}>
            In hóa đơn
          </Button>
        </div>
      </div>
    </div>
  )
}
