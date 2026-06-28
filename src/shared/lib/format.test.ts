import { describe, it, expect } from 'vitest'
import { formatVND, toNumber } from './format'

describe('toNumber', () => {
  it('returns numbers unchanged', () => {
    expect(toNumber(50000)).toBe(50000)
  })
  it('coerces integer-strings (as the BE may serialize money)', () => {
    expect(toNumber('50000')).toBe(50000)
  })
  it('falls back to 0 for nullish or invalid input', () => {
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
    expect(toNumber('abc')).toBe(0)
  })
})

describe('formatVND', () => {
  it('formats an integer amount as VND without decimals', () => {
    const out = formatVND(50000)
    expect(out).toMatch(/50[.,]000/)
    expect(out).not.toMatch(/[.,]00\b/) // no fractional digits
  })
  it('formats zero', () => {
    expect(formatVND(0)).toMatch(/0/)
  })
})
