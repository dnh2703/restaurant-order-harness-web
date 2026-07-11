import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Calendar } from './Calendar'

describe('Calendar', () => {
  it('renders a month grid for the given default month', () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 6, 1)} />)
    // react-day-picker renders the day cells as a grid.
    expect(screen.getByRole('grid')).toBeInTheDocument()
    // The 15th of the month is present as a day cell.
    expect(screen.getByText('15')).toBeInTheDocument()
  })
})
