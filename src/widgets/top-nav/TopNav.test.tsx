import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopNav } from './TopNav'

const restaurant = { name: 'Bếp Mộc' }
const table = { id: 't1', name: 'Bàn 12', status: 'OCCUPIED' as const }

function setup(over: Partial<React.ComponentProps<typeof TopNav>> = {}) {
  const props = {
    restaurant,
    table,
    query: '',
    onQueryChange: vi.fn(),
    cartCount: 0,
    onOpenCart: vi.fn(),
    ...over,
  }
  render(<TopNav {...props} />)
  return props
}

describe('TopNav', () => {
  it('shows restaurant and table', () => {
    setup()
    expect(screen.getByText('Bếp Mộc')).toBeInTheDocument()
    expect(screen.getByText(/Bàn 12/i)).toBeInTheDocument()
  })
  it('emits query changes from the search box', () => {
    const { onQueryChange } = setup()
    fireEvent.change(screen.getByPlaceholderText('Tìm món…'), { target: { value: 'pho' } })
    expect(onQueryChange).toHaveBeenCalledWith('pho')
  })
  it('opens the cart from the cart icon', () => {
    const { onOpenCart } = setup({ cartCount: 3 })
    fireEvent.click(screen.getByRole('button', { name: /Mở giỏ hàng/ }))
    expect(onOpenCart).toHaveBeenCalled()
  })
  it('shows the item count badge on the cart icon', () => {
    setup({ cartCount: 3 })
    expect(screen.getByRole('button', { name: 'Mở giỏ hàng, 3 món' })).toHaveTextContent('3')
  })
})
