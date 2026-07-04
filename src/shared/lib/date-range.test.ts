import { describe, expect, it } from 'vitest'
import { addDays, eachDayInclusive, presetRange, todayISO } from './date-range'

describe('date-range helpers', () => {
  it('shifts an ISO date across a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('lists inclusive days and returns empty when from > to', () => {
    expect(eachDayInclusive('2026-07-01', '2026-07-03')).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
    ])
    expect(eachDayInclusive('2026-07-03', '2026-07-01')).toEqual([])
  })

  it('computes preset ranges ending today', () => {
    const today = todayISO()
    expect(presetRange('today')).toEqual({ from: today, to: today })
    expect(presetRange('7d')).toEqual({ from: addDays(today, -6), to: today })
    expect(presetRange('30d')).toEqual({ from: addDays(today, -29), to: today })
  })
})
