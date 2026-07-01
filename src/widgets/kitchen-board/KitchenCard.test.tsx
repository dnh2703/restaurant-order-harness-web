import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KitchenCard } from './KitchenCard'
import type { KitchenQueueItem } from '@/entities/kitchen'

// Timezone-safe: a bare date-time string is parsed as LOCAL time, and the card
// also formats in local time, so the expected "HH:mm" holds in any timezone.
const pending: KitchenQueueItem = {
  id: 'oi1',
  tableName: 'Bàn 5',
  nameSnapshot: 'Phở bò',
  quantity: 2,
  note: 'ít hành',
  status: 'PENDING',
  createdAt: new Date('2026-07-01T09:05:00').toISOString(),
  options: [{ optionName: 'Thêm trứng', priceDelta: 5000 }],
}

describe('KitchenCard', () => {
  it('shows table, qty, name, note, options and the order time for a pending item', () => {
    render(<KitchenCard item={pending} onAdvance={vi.fn()} />)
    expect(screen.getByText('Bàn 5')).toBeInTheDocument()
    expect(screen.getByText(/Phở bò/)).toBeInTheDocument()
    expect(screen.getByText(/× 2/)).toBeInTheDocument()
    expect(screen.getByText(/ít hành/)).toBeInTheDocument()
    expect(screen.getByText(/Thêm trứng/)).toBeInTheDocument()
    expect(screen.getByText('09:05')).toBeInTheDocument()
  })

  it('a pending card calls onAdvance with COOKING via "Bắt đầu"', () => {
    const onAdvance = vi.fn()
    render(<KitchenCard item={pending} onAdvance={onAdvance} />)
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    expect(onAdvance).toHaveBeenCalledWith('oi1', 'COOKING')
  })

  it('a cooking card calls onAdvance with SERVED via "Hoàn thành"', () => {
    const onAdvance = vi.fn()
    render(<KitchenCard item={{ ...pending, status: 'COOKING' }} onAdvance={onAdvance} />)
    fireEvent.click(screen.getByRole('button', { name: /Hoàn thành/ }))
    expect(onAdvance).toHaveBeenCalledWith('oi1', 'SERVED')
  })

  it('renders a served card as completed showing the clock time', () => {
    render(
      <KitchenCard
        item={{
          id: 's1',
          tableName: 'Bàn 9',
          nameSnapshot: 'Gỏi',
          quantity: 2,
          note: null,
          options: [],
          servedAt: new Date('2026-07-01T14:32:00').toISOString(),
        }}
        served
      />,
    )
    expect(screen.getByText('Bàn 9')).toBeInTheDocument()
    expect(screen.getByText('14:32')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
