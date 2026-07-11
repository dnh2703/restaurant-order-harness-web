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
    expect(screen.getAllByRole('grid')).toHaveLength(2)
  })

  it('requires two clicks to select a fresh range: first click starts it (no emit), second click completes it (emits + closes)', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: '2026-07-10', to: '2026-07-10' }} onChange={onChange} />)

    // Open the popover.
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getAllByRole('grid')).toHaveLength(2)

    // First click: July 12 starts a new range. Must NOT emit; popover stays open.
    // Popover content renders into a portal, so query the document rather than the render container.
    const day12 = document.querySelector<HTMLButtonElement>('[data-day="2026-07-12"] button')
    expect(day12).toBeTruthy()
    fireEvent.click(day12 as HTMLButtonElement)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getAllByRole('grid')).toHaveLength(2)

    // Second click: July 18 completes the range. Must emit ordered ISO endpoints and close.
    const day18 = document.querySelector<HTMLButtonElement>('[data-day="2026-07-18"] button')
    expect(day18).toBeTruthy()
    fireEvent.click(day18 as HTMLButtonElement)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ from: '2026-07-12', to: '2026-07-18' })
    expect(screen.queryAllByRole('grid')).toHaveLength(0)
  })
})
