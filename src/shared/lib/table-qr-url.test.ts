import { describe, it, expect } from 'vitest'
import { buildTableQrUrl } from './table-qr-url'

describe('buildTableQrUrl', () => {
  it('builds an absolute /t/:token URL without a trailing slash on origin', () => {
    expect(buildTableQrUrl('http://localhost:3001', 'qr-table-01')).toBe(
      'http://localhost:3001/t/qr-table-01',
    )
  })

  it('strips a trailing slash from origin', () => {
    expect(buildTableQrUrl('https://demo.test/', 'abc token')).toBe(
      'https://demo.test/t/abc%20token',
    )
  })
})
