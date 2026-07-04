import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeControl } from './DateRangeControl'
import { todayISO } from '@/shared/lib/date-range'

describe('DateRangeControl', () => {
  it('emits a range ending today when a preset is clicked', () => {
    const onChange = vi.fn()
    render(
      <DateRangeControl value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hôm nay' }))
    expect(onChange).toHaveBeenCalledWith({ from: todayISO(), to: todayISO() })
  })

  it('clamps the range when the chosen "from" is after "to"', () => {
    const onChange = vi.fn()
    render(
      <DateRangeControl value={{ from: '2026-07-01', to: '2026-07-07' }} onChange={onChange} />,
    )

    fireEvent.change(screen.getByLabelText('Từ'), { target: { value: '2026-07-20' } })
    expect(onChange).toHaveBeenCalledWith({ from: '2026-07-20', to: '2026-07-20' })
  })
})
