import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InvoiceReceipt } from './InvoiceReceipt'
import type { BillDetail } from '@/entities/cashier'

const bill: BillDetail = {
  orderId: 'o1',
  status: 'PAID',
  subtotal: 55000,
  discountAmount: 10000,
  discountReason: 'VIP',
  total: 45000,
  openedAt: '2026-07-04T10:00:00Z',
  items: [
    {
      id: 'i1',
      nameSnapshot: 'Phở bò',
      unitPrice: 55000,
      quantity: 1,
      note: null,
      status: 'SERVED',
      options: [],
    },
  ],
}

describe('InvoiceReceipt', () => {
  it('shows totals and calls window.print', () => {
    // Assign print function if it doesn't exist (happy-dom doesn't include window.print)
    if (!window.print) {
      window.print = vi.fn()
    }
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<InvoiceReceipt bill={bill} tableName="Bàn 5" method="CASH" onClose={() => {}} />)
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
    expect(screen.getByText('45.000đ')).toBeInTheDocument()
    expect(screen.getByText('Tiền mặt')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'In hóa đơn' }))
    expect(printSpy).toHaveBeenCalled()
    printSpy.mockRestore()
  })

  it('calls onClose when dismissed', () => {
    const onClose = vi.fn()
    render(<InvoiceReceipt bill={bill} tableName="Bàn 5" method="CASH" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalled()
  })
})
