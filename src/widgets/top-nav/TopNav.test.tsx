import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopNav } from './TopNav'

const restaurant = { name: 'Bếp Mộc' }
const table = { id: 't1', name: 'Bàn 12', status: 'OCCUPIED' as const }

describe('TopNav', () => {
  it('shows restaurant and table', () => {
    render(<TopNav restaurant={restaurant} table={table} query="" onQueryChange={() => {}} />)
    expect(screen.getByText('Bếp Mộc')).toBeInTheDocument()
    expect(screen.getByText(/Bàn 12/i)).toBeInTheDocument()
  })
  it('emits query changes from the search box', () => {
    const onQueryChange = vi.fn()
    render(<TopNav restaurant={restaurant} table={table} query="" onQueryChange={onQueryChange} />)
    fireEvent.change(screen.getByPlaceholderText('Tìm món…'), { target: { value: 'pho' } })
    expect(onQueryChange).toHaveBeenCalledWith('pho')
  })
})
