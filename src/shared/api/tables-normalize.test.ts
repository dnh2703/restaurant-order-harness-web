import { describe, it, expect } from 'vitest'
import { normalizeAdminTable } from './tables-normalize'

describe('normalizeAdminTable', () => {
  it('maps a BE table row', () => {
    expect(
      normalizeAdminTable({
        id: 'uuid-1',
        name: 'Bàn 5',
        capacity: 4,
        qrToken: 'tok-abc',
        status: 'EMPTY',
      }),
    ).toEqual({
      id: 'uuid-1',
      name: 'Bàn 5',
      capacity: 4,
      qrToken: 'tok-abc',
      status: 'EMPTY',
    })
  })

  it('coerces null capacity and unknown status', () => {
    expect(
      normalizeAdminTable({
        id: 'x',
        name: 'Bàn 1',
        capacity: null,
        qrToken: 't',
        status: 'OCCUPIED',
      }),
    ).toMatchObject({ capacity: null, status: 'OCCUPIED' })

    expect(
      normalizeAdminTable({
        id: 'x',
        name: 'Bàn 1',
        qrToken: 't',
        status: 'WEIRD',
      }),
    ).toMatchObject({ status: 'EMPTY' })
  })
})
