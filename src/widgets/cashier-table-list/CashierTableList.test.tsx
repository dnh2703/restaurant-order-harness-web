import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CashierTableList } from './CashierTableList'
import type { CashierTable } from '@/entities/cashier'

const tables: CashierTable[] = [
  {
    orderId: 'o1',
    tableId: 't1',
    tableName: 'Bàn 5',
    subtotal: 410000,
    discountAmount: 0,
    total: 410000,
    openedAt: '2026-07-04T10:00:00Z',
    itemCount: 4,
  },
]

describe('CashierTableList', () => {
  it('renders a table row with its total and fires onSelect', () => {
    const onSelect = vi.fn()
    render(<CashierTableList tables={tables} selectedOrderId={null} onSelect={onSelect} />)
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
    expect(screen.getByText('410.000đ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bàn 5/ }))
    expect(onSelect).toHaveBeenCalledWith('o1')
  })

  it('shows an empty state when there are no open tables', () => {
    render(<CashierTableList tables={[]} selectedOrderId={null} onSelect={() => {}} />)
    expect(screen.getByText('Chưa có bàn nào mở')).toBeInTheDocument()
  })
})
