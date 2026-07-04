import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CashierBillPanel } from './CashierBillPanel'
import type { BillDetail } from '@/entities/cashier'

const bill: BillDetail = {
  orderId: 'o1',
  status: 'OPEN',
  subtotal: 190000,
  discountAmount: 10000,
  discountReason: 'Khách quen',
  total: 180000,
  openedAt: '2026-07-04T10:00:00Z',
  items: [
    {
      id: 'i1',
      nameSnapshot: 'Phở bò',
      unitPrice: 95000,
      quantity: 2,
      note: null,
      status: 'SERVED',
      options: [],
    },
  ],
}

describe('CashierBillPanel', () => {
  it('prompts to pick a table when no bill is selected', () => {
    render(
      <CashierBillPanel bill={null} busy={false} onApplyDiscount={() => {}} onPay={() => {}} />,
    )
    expect(screen.getByText('Chọn một bàn để xem hóa đơn')).toBeInTheDocument()
  })

  it('renders line items and totals', () => {
    render(
      <CashierBillPanel bill={bill} busy={false} onApplyDiscount={() => {}} onPay={() => {}} />,
    )
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText('180.000đ')).toBeInTheDocument()
  })

  it('submits a discount', () => {
    const onApplyDiscount = vi.fn()
    render(
      <CashierBillPanel
        bill={bill}
        busy={false}
        onApplyDiscount={onApplyDiscount}
        onPay={() => {}}
      />,
    )
    fireEvent.change(screen.getByLabelText('Giá trị giảm'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'VIP' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng giảm giá' }))
    expect(onApplyDiscount).toHaveBeenCalledWith({ type: 'PERCENT', value: 10, reason: 'VIP' })
  })

  it('pays with the selected method', () => {
    const onPay = vi.fn()
    render(<CashierBillPanel bill={bill} busy={false} onApplyDiscount={() => {}} onPay={onPay} />)
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán' }))
    expect(onPay).toHaveBeenCalledWith('CASH')
  })
})
