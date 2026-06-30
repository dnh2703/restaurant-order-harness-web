import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KitchenCard } from './KitchenCard'
import type { KitchenQueueItem } from '@/entities/kitchen/model'

const pending: KitchenQueueItem = {
  id: 'oi1',
  tableName: 'Bàn 5',
  nameSnapshot: 'Phở bò',
  quantity: 2,
  note: 'ít hành',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  options: [{ optionName: 'Thêm trứng', priceDelta: 5000 }],
}

describe('KitchenCard', () => {
  it('shows table, qty, name, note and options for a pending item', () => {
    render(<KitchenCard item={pending} onAdvance={vi.fn()} />)
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
    expect(screen.getByText(/Phở bò/)).toBeInTheDocument()
    expect(screen.getByText(/× 2/)).toBeInTheDocument()
    expect(screen.getByText(/ít hành/)).toBeInTheDocument()
    expect(screen.getByText(/Thêm trứng/)).toBeInTheDocument()
  })

  it('a pending card calls onAdvance with COOKING via "Bắt đầu"', () => {
    const onAdvance = vi.fn()
    render(<KitchenCard item={pending} onAdvance={onAdvance} />)
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    expect(onAdvance).toHaveBeenCalledWith('oi1', 'COOKING')
  })

  it('a cooking card calls onAdvance with SERVED via "Xong"', () => {
    const onAdvance = vi.fn()
    render(<KitchenCard item={{ ...pending, status: 'COOKING' }} onAdvance={onAdvance} />)
    fireEvent.click(screen.getByRole('button', { name: /Xong/ }))
    expect(onAdvance).toHaveBeenCalledWith('oi1', 'SERVED')
  })
})
