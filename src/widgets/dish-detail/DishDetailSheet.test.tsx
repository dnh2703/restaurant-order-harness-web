// src/widgets/dish-detail/DishDetailSheet.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DishDetailSheet } from './DishDetailSheet'
import type { MenuItem } from '@/entities/menu'

const item: MenuItem = {
  id: 'm1',
  name: 'Phở bò',
  description: 'Truyền thống',
  price: 50000,
  imageUrl: null,
  isAvailable: true,
  optionGroups: [
    {
      id: 'g-size',
      name: 'Size',
      type: 'SINGLE',
      isRequired: true,
      options: [
        { id: 's', name: 'Nhỏ', priceDelta: 0 },
        { id: 'l', name: 'Lớn', priceDelta: 10000 },
      ],
    },
    {
      id: 'g-top',
      name: 'Topping',
      type: 'MULTI',
      isRequired: false,
      options: [{ id: 't1', name: 'Trứng', priceDelta: 5000 }],
    },
  ],
}

function setup(over: Partial<Parameters<typeof DishDetailSheet>[0]> = {}) {
  const onAdd = vi.fn()
  const onOpenChange = vi.fn()
  render(<DishDetailSheet item={item} open onOpenChange={onOpenChange} onAdd={onAdd} {...over} />)
  return { onAdd, onOpenChange }
}

describe('DishDetailSheet', () => {
  it('renders option groups with the right controls and price deltas', () => {
    setup()
    expect(screen.getByRole('radio', { name: /Nhỏ/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Lớn/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Trứng/ })).toBeInTheDocument()
    expect(screen.getByText(/\+10[.,]000đ/)).toBeInTheDocument()
  })

  it('updates the footer price as options change', () => {
    setup()
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toHaveTextContent(/50[.,]000đ/)
    fireEvent.click(screen.getByRole('radio', { name: /Lớn/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Trứng/ }))
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toHaveTextContent(/65[.,]000đ/)
  })

  it('emits a cart line with selected options and trimmed note on add', () => {
    const { onAdd, onOpenChange } = setup()
    fireEvent.click(screen.getByRole('radio', { name: /Lớn/ }))
    fireEvent.change(screen.getByPlaceholderText(/Ghi chú/), { target: { value: '  ít hành ' } })
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/ }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        menuItemId: 'm1',
        unitPrice: 60000,
        note: 'ít hành',
        options: [expect.objectContaining({ id: 'l' })],
      }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables add until a required MULTI group is satisfied', () => {
    const requiredMulti: MenuItem = {
      ...item,
      optionGroups: [{ ...item.optionGroups[1]!, isRequired: true }],
    }
    setup({ item: requiredMulti })
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Trứng/ }))
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/ })).toBeEnabled()
  })
})
