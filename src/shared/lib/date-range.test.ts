import { describe, expect, it } from 'vitest'
import {
  dateToISO,
  isoToDate,
  matchPreset,
  rdpRangeToIso,
  addDays,
  eachDayInclusive,
  presetRange,
  todayISO,
} from './date-range'

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

describe('date <-> ISO conversion', () => {
  it('round-trips ISO through Date in local time', () => {
    expect(dateToISO(isoToDate('2026-07-04'))).toBe('2026-07-04')
    expect(dateToISO(isoToDate('2026-01-31'))).toBe('2026-01-31')
  })

  it('isoToDate builds a local midnight date', () => {
    const d = isoToDate('2026-07-04')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6) // July = 6
    expect(d.getDate()).toBe(4)
  })
})

describe('matchPreset', () => {
  it('recognises each preset range', () => {
    expect(matchPreset(presetRange('today'))).toBe('today')
    expect(matchPreset(presetRange('7d'))).toBe('7d')
    expect(matchPreset(presetRange('30d'))).toBe('30d')
  })

  it('returns null for a custom range', () => {
    expect(matchPreset({ from: '2026-01-01', to: '2026-01-15' })).toBeNull()
  })
})

describe('rdpRangeToIso', () => {
  it('converts a complete Date range to ISO', () => {
    expect(rdpRangeToIso({ from: isoToDate('2026-07-15'), to: isoToDate('2026-07-20') })).toEqual({
      from: '2026-07-15',
      to: '2026-07-20',
    })
  })

  it('returns null when the range is incomplete or undefined', () => {
    expect(rdpRangeToIso(undefined)).toBeNull()
    expect(rdpRangeToIso({ from: isoToDate('2026-07-15') })).toBeNull()
  })
})
