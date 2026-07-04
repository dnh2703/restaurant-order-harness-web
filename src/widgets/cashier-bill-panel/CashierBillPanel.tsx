import { useState } from 'react'
import type { BillDetail, DiscountType, PaymentMethod } from '@/entities/cashier'
import { formatVND } from '@/shared/lib/format'
import { Button, Input, Select, type SelectOption } from '@/shared/ui'

interface Props {
  bill: BillDetail | null
  busy: boolean
  onApplyDiscount: (input: { type: DiscountType; value: number; reason: string }) => void
  onPay: (method: PaymentMethod) => void
}

const DISCOUNT_TYPES: SelectOption[] = [
  { value: 'PERCENT', label: '%' },
  { value: 'FIXED', label: 'đ' },
]

const METHODS: SelectOption[] = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'TRANSFER', label: 'Chuyển khoản' },
  { value: 'CARD', label: 'Thẻ' },
]

/** Filled field styling so the discount inputs read clearly on the panel. */
const fieldClass = 'h-11 border border-line-strong bg-white'

export function CashierBillPanel({ bill, busy, onApplyDiscount, onPay }: Props) {
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENT')
  const [discountValue, setDiscountValue] = useState('')
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')

  if (!bill) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Chọn một bàn để xem hóa đơn
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <ul className="flex flex-col gap-2">
        {bill.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-ink">
              {item.nameSnapshot} <span className="text-muted">×{item.quantity}</span>
              {item.options.length > 0 && (
                <span className="block text-xs text-muted">
                  {item.options.map((o) => o.optionName).join(', ')}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap font-medium text-ink">
              {formatVND(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Tạm tính</dt>
          <dd className="font-medium text-ink">{formatVND(bill.subtotal)}</dd>
        </div>
        {bill.discountAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">
              Giảm giá{bill.discountReason ? ` (${bill.discountReason})` : ''}
            </dt>
            <dd className="font-medium text-ink">−{formatVND(bill.discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-base">
          <dt className="font-semibold text-ink">Tổng</dt>
          <dd className="font-bold text-brand">{formatVND(bill.total)}</dd>
        </div>
      </dl>

      <fieldset className="flex flex-col gap-2 border-t border-line pt-3">
        <legend className="mb-1 text-sm font-semibold text-ink-soft">Giảm giá / phụ thu</legend>
        <div className="flex gap-2">
          <Select
            ariaLabel="Loại giảm giá"
            value={discountType}
            onValueChange={(v) => setDiscountType(v as DiscountType)}
            options={DISCOUNT_TYPES}
            className="w-24 shrink-0"
          />
          <Input
            type="number"
            aria-label="Giá trị giảm"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="0"
            containerClassName={fieldClass}
          />
        </div>
        <Input
          type="text"
          aria-label="Lý do"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do"
          containerClassName={fieldClass}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={busy || discountValue === ''}
          onClick={() =>
            onApplyDiscount({ type: discountType, value: Number(discountValue), reason })
          }
        >
          Áp dụng giảm giá
        </Button>
      </fieldset>

      <fieldset className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
        <legend className="mb-1 text-sm font-semibold text-ink-soft">Thanh toán</legend>
        <Select
          ariaLabel="Phương thức thanh toán"
          value={method}
          onValueChange={(v) => setMethod(v as PaymentMethod)}
          options={METHODS}
          className="w-full"
        />
        <Button type="button" fullWidth size="lg" disabled={busy} onClick={() => onPay(method)}>
          Thanh toán
        </Button>
      </fieldset>
    </div>
  )
}
