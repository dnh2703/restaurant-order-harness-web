import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartPanel } from './CartPanel'
import type { CartLine } from '@/entities/cart/model'

const cart: CartLine[] = [{ id: 'i1', name: 'Phở bò', price: 50000, imageUrl: null, quantity: 2 }]

function setup(over = {}) {
  const props = {
    cart,
    onSetQty: vi.fn(),
    onSubmit: vi.fn(),
    submitting: false,
    error: null,
    ...over,
  }
  render(<CartPanel {...props} />)
  return props
}

describe('CartPanel', () => {
  it('shows lines and total (subtotal)', () => {
    setup()
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gửi bếp/ })).toHaveTextContent(/100[.,]000đ/)
  })
  it('increments and decrements via stepper', () => {
    const { onSetQty } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Phở bò' }))
    expect(onSetQty).toHaveBeenCalledWith('i1', 3)
    fireEvent.click(screen.getByRole('button', { name: 'Giảm Phở bò' }))
    expect(onSetQty).toHaveBeenCalledWith('i1', 1)
  })
  it('submits the order', () => {
    const { onSubmit } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Gửi bếp/ }))
    expect(onSubmit).toHaveBeenCalled()
  })
  it('shows an empty state and no submit when cart empty', () => {
    setup({ cart: [] })
    expect(screen.getByText(/Giỏ hàng trống/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gửi bếp/ })).not.toBeInTheDocument()
  })
  it('shows an error message', () => {
    setup({ error: 'Lỗi gửi đơn' })
    expect(screen.getByText('Lỗi gửi đơn')).toBeInTheDocument()
  })
})
