import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AdminTableView } from '@/shared/api/types/admin-table'
import { KitchenTableList } from './KitchenTableList'

const tables: AdminTableView[] = [
  { id: 't1', name: 'Bàn 1', capacity: 4, qrToken: 'qr-1', status: 'EMPTY' },
  { id: 't2', name: 'Bàn VIP', capacity: 8, qrToken: 'qr-2', status: 'OCCUPIED' },
]

describe('KitchenTableList', () => {
  it('opens the create dialog from a button and submits a new table', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)

    render(
      <KitchenTableList
        tables={tables}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onOpenQr={vi.fn()}
      />,
    )

    expect(screen.queryByPlaceholderText('Bàn 10')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Thêm bàn ăn' }))

    fireEvent.change(screen.getByLabelText('Tên bàn'), { target: { value: 'Bàn 2' } })
    fireEvent.change(screen.getByLabelText('Sức chứa'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bàn' }))

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({ name: 'Bàn 2', capacity: 6 })
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('filters tables by search text', () => {
    render(
      <KitchenTableList
        tables={tables}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onOpenQr={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Tìm bàn...'), { target: { value: 'vip' } })

    expect(screen.getByRole('cell', { name: 'Bàn VIP' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Bàn 1' })).not.toBeInTheDocument()
  })

  it('keeps the search input and create button at the same height', () => {
    render(
      <KitchenTableList
        tables={tables}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onOpenQr={vi.fn()}
      />,
    )

    expect(
      screen.getByPlaceholderText('Tìm bàn...').closest('[data-slot="input-wrapper"]'),
    ).toHaveClass('h-11')
    expect(screen.getByRole('button', { name: 'Thêm bàn ăn' })).toHaveClass('h-11')
  })
})
