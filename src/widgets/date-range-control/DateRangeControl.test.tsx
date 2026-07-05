import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeControl } from './DateRangeControl'
import { presetRange, todayISO } from '@/shared/lib/date-range'

describe('DateRangeControl', () => {
  it('emits a range ending today when a preset is clicked', () => {
    const onChange = vi.fn()
    render(
      <DateRangeControl value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    expect(onChange).toHaveBeenCalledWith({ from: todayISO(), to: todayISO() })
  })

  it('marks the active preset with aria-pressed when the value matches it', () => {
    render(<DateRangeControl value={presetRange('7d')} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '7 ngày' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hôm nay' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '30 ngày' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks no preset active for a custom range', () => {
    render(<DateRangeControl value={{ from: '2026-01-01', to: '2026-01-15' }} onChange={vi.fn()} />)
    for (const label of ['Hôm nay', '7 ngày', '30 ngày']) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('renders a date range picker trigger showing the current range', () => {
    render(<DateRangeControl value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={vi.fn()} />)
    // The picker trigger shows a "from – to" label (contains the en dash).
    expect(screen.getByText((t) => t.includes('–'))).toBeInTheDocument()
  })
})
