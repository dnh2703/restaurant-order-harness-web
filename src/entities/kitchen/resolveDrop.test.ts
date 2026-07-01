import { describe, it, expect } from 'vitest'
import { resolveDrop } from './resolveDrop'

describe('resolveDrop', () => {
  it('PENDING dropped on Đang làm advances to COOKING', () => {
    expect(resolveDrop('PENDING', 'COOKING')).toBe('COOKING')
  })
  it('COOKING dropped on Đã xong advances to SERVED', () => {
    expect(resolveDrop('COOKING', 'SERVED')).toBe('SERVED')
  })
  it('no-ops when dropped on the same column', () => {
    expect(resolveDrop('PENDING', 'PENDING')).toBeNull()
    expect(resolveDrop('COOKING', 'COOKING')).toBeNull()
  })
  it('rejects skipping a step (PENDING → SERVED)', () => {
    expect(resolveDrop('PENDING', 'SERVED')).toBeNull()
  })
  it('rejects backward moves (COOKING → PENDING)', () => {
    expect(resolveDrop('COOKING', 'PENDING')).toBeNull()
  })
})
