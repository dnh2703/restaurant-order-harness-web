import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KitchenBoard } from './KitchenBoard'
import type { KitchenQueueItem, ServedItem } from '@/entities/kitchen/model'

const base = {
  tableName: 'Bàn 1',
  nameSnapshot: 'Phở',
  quantity: 1,
  note: null,
  options: [],
  createdAt: 't',
}
const queue: KitchenQueueItem[] = [
  { ...base, id: 'p1', status: 'PENDING' },
  { ...base, id: 'p2', status: 'PENDING' },
  { ...base, id: 'c1', status: 'COOKING' },
]
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
  it('renders the three columns with counts', () => {
    render(<KitchenBoard queue={queue} served={served} onAdvance={vi.fn()} />)
    expect(screen.getByText(/Chờ làm \(2\)/)).toBeInTheDocument()
    expect(screen.getByText(/Đang làm \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Đã xong/)).toBeInTheDocument()
  })

  it('shows an empty state for an empty pending column', () => {
    render(<KitchenBoard queue={[]} served={[]} onAdvance={vi.fn()} />)
    expect(screen.getAllByText(/Chưa có món/).length).toBeGreaterThan(0)
  })
})
