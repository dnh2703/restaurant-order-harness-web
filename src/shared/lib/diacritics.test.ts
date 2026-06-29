import { describe, it, expect } from 'vitest'
import { normalizeVN, matchesQuery } from './diacritics'

describe('normalizeVN', () => {
  it('strips Vietnamese diacritics and lowercases', () => {
    expect(normalizeVN('Phở Bò')).toBe('pho bo')
  })
  it('maps đ/Đ to d', () => {
    expect(normalizeVN('Đậu')).toBe('dau')
  })
})

describe('matchesQuery', () => {
  it('matches ignoring diacritics and case', () => {
    expect(matchesQuery('Phở bò tái', 'pho')).toBe(true)
    expect(matchesQuery('Phở bò tái', 'BO')).toBe(true)
  })
  it('returns true for empty query', () => {
    expect(matchesQuery('anything', '')).toBe(true)
    expect(matchesQuery('anything', '   ')).toBe(true)
  })
  it('returns false when not found', () => {
    expect(matchesQuery('Phở bò', 'lau')).toBe(false)
  })
})
