import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopDishesTable } from './TopDishesTable'

describe('TopDishesTable', () => {
  it('renders ranked rows with formatted revenue', () => {
    render(
      <TopDishesTable
        dishes={[
          { menuItemId: 'm1', name: 'Phở bò', quantitySold: 8, revenue: 417000 },
          { menuItemId: 'm2', name: 'Trà đá', quantitySold: 1, revenue: 5000 },
        ]}
      />,
    )
    expect(screen.getByText('Phở bò')).toBeInTheDocument()
    expect(screen.getByText('417.000đ')).toBeInTheDocument()
    expect(screen.getByText('Trà đá')).toBeInTheDocument()
  })

  it('shows an empty state with no dishes', () => {
    render(<TopDishesTable dishes={[]} />)
    expect(screen.getByText('Chưa có dữ liệu bán hàng trong khoảng này.')).toBeInTheDocument()
  })
})
