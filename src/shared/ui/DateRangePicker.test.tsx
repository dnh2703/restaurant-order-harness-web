import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangePicker, formatRangeLabel } from './DateRangePicker'

describe('formatRangeLabel', () => {
  it('shows a single formatted date when from === to', () => {
    const label = formatRangeLabel({ from: '2026-07-04', to: '2026-07-04' })
    expect(label).not.toContain('–')
    expect(label).toContain('2026')
  })

  it('shows a from–to range when the dates differ', () => {
    const label = formatRangeLabel({ from: '2026-07-01', to: '2026-07-07' })
    expect(label).toContain('–')
  })
})

describe('DateRangePicker', () => {
  it('renders a trigger showing the current range label', () => {
    render(<DateRangePicker value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: (n) => n.includes('–') })).toBeInTheDocument()
  })

  it('opens the calendar grid when the trigger is clicked', () => {
    render(<DateRangePicker value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: (n) => n.includes('–') }))
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })
})
