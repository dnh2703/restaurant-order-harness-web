import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { KitchenBoard } from './KitchenBoard'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen'

const base = {
  tableName: 'Bàn 1',
  nameSnapshot: 'Phở',
  quantity: 1,
  note: null,
  options: [],
  createdAt: 't',
}
const pending: KitchenQueueItem[] = [
  { ...base, id: 'p1', status: 'PENDING' },
  { ...base, id: 'p2', status: 'PENDING' },
]
const cooking: KitchenQueueItem[] = [{ ...base, id: 'c1', status: 'COOKING' }]
const served: ServedItem[] = [
  {
    id: 's1',
    tableName: 'Bàn 4',
    nameSnapshot: 'Gỏi',
    quantity: 1,
    note: null,
    options: [],
    servedAt: new Date().toISOString(),
  },
]

describe('KitchenBoard', () => {
  it('renders the three columns with their counts', () => {
    render(<KitchenBoard pending={pending} cooking={cooking} served={served} onAdvance={vi.fn()} />)
    const pendingCol = screen.getByRole('region', { name: /Chờ làm/ })
    const cookingCol = screen.getByRole('region', { name: /Đang làm/ })
    const doneCol = screen.getByRole('region', { name: /Đã xong/ })
    expect(within(pendingCol).getByText('2')).toBeInTheDocument()
    expect(within(cookingCol).getByText('1')).toBeInTheDocument()
    expect(within(doneCol).getByText('Bàn 4')).toBeInTheDocument()
  })

  it('shows an empty state for an empty column', () => {
    render(<KitchenBoard pending={[]} cooking={[]} served={[]} onAdvance={vi.fn()} />)
    expect(screen.getAllByText(/Chưa có món/).length).toBeGreaterThan(0)
  })
})
